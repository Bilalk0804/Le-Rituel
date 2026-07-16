import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, X, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function withinWindow(target, now, windowMin = 60) {
  // Both are HH:MM. Show the banner if we're between target and target+windowMin.
  if (!target || !now) return false;
  const [th, tm] = target.split(":").map(Number);
  const [nh, nm] = now.split(":").map(Number);
  const targetMin = th * 60 + tm;
  const nowMin = nh * 60 + nm;
  return nowMin >= targetMin && nowMin < targetMin + windowMin;
}

/**
 * Global reminder banner. Polls the server every 5 min for the user's
 * reminder prefs + today's completion state. Every minute, if a reminder
 * time has passed and the corresponding routine isn't done yet, show a
 * soft in-app banner. If the browser's Notification permission is granted,
 * also fire a foreground Notification once per session per slot.
 */
export function ReminderBanner() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState(null);
  const [completion, setCompletion] = useState({ am_done: false, pm_done: false, date: todayISO() });
  const [dismissed, setDismissed] = useState({ am: false, pm: false });
  const notifiedRef = useRef({ am: false, pm: false });
  const [nowStr, setNowStr] = useState(nowHHMM());

  // Fetch prefs + completion state on mount and periodically.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [{ data: r }, { data: s }] = await Promise.all([
          api.get("/settings/reminders"),
          api.get("/routine/streak"),
        ]);
        if (cancelled) return;
        setPrefs(r.reminders);
        setCompletion(s.today);
      } catch {
        /* silent */
      }
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user]);

  // Tick every 60s so the banner appears without a reload.
  useEffect(() => {
    const id = setInterval(() => setNowStr(nowHHMM()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (!user || !prefs?.enabled) return null;

  const amDue = withinWindow(prefs.am_time, nowStr) && !completion.am_done && !dismissed.am;
  const pmDue = withinWindow(prefs.pm_time, nowStr) && !completion.pm_done && !dismissed.pm;

  const active = amDue ? "am" : pmDue ? "pm" : null;
  if (!active) return null;

  // Fire a browser notification once per slot per session, if permission granted.
  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted" &&
    !notifiedRef.current[active]
  ) {
    notifiedRef.current[active] = true;
    try {
      new Notification(
        active === "am" ? "Morning ritual" : "Evening ritual",
        {
          body:
            active === "am"
              ? "Cleanse, moisturize, SPF — your skin's daily armour."
              : "Wind down with your evening ritual. A few gentle steps.",
          tag: `le-rituel-${active}`,
        }
      );
    } catch {
      /* Notification may throw in some contexts; UI banner still shows */
    }
  }

  const isAm = active === "am";
  const Icon = isAm ? Sun : Moon;
  const label = isAm ? "Morning ritual" : "Evening ritual";
  const copy = isAm
    ? "Cleanse, moisturize, SPF — your skin's daily armour."
    : "Wind down. A few gentle steps and then rest.";

  return (
    <AnimatePresence>
      <motion.div
        key={active}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.35 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg"
        data-testid={`reminder-banner-${active}`}
      >
        <div className="rounded-full bg-[#2B3024] text-[#F9F8F5] pl-2 pr-2 py-2 shadow-[0_16px_44px_rgba(43,48,36,0.35)] flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-[#F3E8E0] text-[#2B3024] grid place-items-center flex-shrink-0">
            <Icon className="w-4 h-4" strokeWidth={1.6} />
          </span>
          <div className="flex-1 min-w-0 py-1">
            <p className="text-[10px] tracking-[0.24em] uppercase font-bold text-[#F9F8F5]/60">
              Reminder · {isAm ? prefs.am_time : prefs.pm_time}
            </p>
            <p className="text-sm truncate">
              <span className="font-medium">{label}</span> <span className="text-[#F9F8F5]/70">— {copy}</span>
            </p>
          </div>
          <Link
            to="/dashboard"
            data-testid={`reminder-banner-${active}-open`}
            className="text-[10px] tracking-[0.18em] uppercase font-bold rounded-full bg-[#F9F8F5]/15 hover:bg-[#F9F8F5]/25 px-3 py-2"
          >
            Open
          </Link>
          <button
            onClick={() => setDismissed((d) => ({ ...d, [active]: true }))}
            aria-label="Dismiss reminder"
            data-testid={`reminder-banner-${active}-dismiss`}
            className="w-8 h-8 rounded-full hover:bg-[#F9F8F5]/10 grid place-items-center flex-shrink-0"
          >
            <X className="w-4 h-4" strokeWidth={1.6} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export { todayISO, nowHHMM };
