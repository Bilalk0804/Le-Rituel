import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sun, Moon, RefreshCcw, Settings as SettingsIcon, Check, ArrowRight, FlaskConical, TrendingUp, Flame, MessageCircle } from "lucide-react";
import { api } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";

const CATEGORY_LABEL = {
  cleanser: "Cleanser",
  serum: "Serum",
  moisturizer: "Moisturizer",
  sunscreen: "Sunscreen",
  retinol: "Retinol",
};

function MiniChecklistItem({ step }) {
  const [done, setDone] = useState(false);
  const testid = `dashboard-step-${step.time_of_day}-${step.step_order}`;
  return (
    <li className="flex items-start gap-3" data-testid={testid}>
      <button
        onClick={() => setDone((d) => !d)}
        aria-label={done ? "Mark undone" : "Mark done"}
        data-testid={`${testid}-check`}
        className={`mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0 grid place-items-center transition-colors ${
          done
            ? "bg-[#2B3024] border-[#2B3024] text-[#F9F8F5]"
            : "bg-white border-[#2B3024]/25"
        }`}
      >
        {done && <Check className="w-3.5 h-3.5" strokeWidth={2.4} />}
      </button>
      <div className={`min-w-0 ${done ? "opacity-60" : ""}`}>
        <p className={`text-xs tracking-[0.16em] uppercase font-bold text-[#2B3024]/60`}>
          {String(step.step_order).padStart(2, "0")} · {CATEGORY_LABEL[step.product_category] || step.product_category}
        </p>
        <p className={`text-sm font-medium text-[#2B3024] mt-0.5 leading-snug ${done ? "line-through" : ""}`}>
          {step.product_name || <span className="italic text-[#2B3024]/50">Not set yet</span>}
        </p>
      </div>
    </li>
  );
}

function DashboardChecklist({ title, icon: Icon, steps, bg, chipBg }) {
  return (
    <div className={`rounded-3xl p-7 ${bg}`}>
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-[#2B3024]" strokeWidth={1.6} />
        <p className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/70">
          {title}
        </p>
        <span className={`ml-auto text-[10px] tracking-[0.18em] uppercase text-[#2B3024]/60 rounded-full px-2 py-0.5 ${chipBg}`}>
          {steps.length} steps
        </span>
      </div>
      <ul className="mt-5 space-y-4">
        {steps.map((s) => (
          <MiniChecklistItem key={`${s.time_of_day}-${s.step_order}`} step={s} />
        ))}
      </ul>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [routine, setRoutine] = useState(null);
  const [profile, setProfile] = useState(null);
  const [streak, setStreak] = useState({ streak: 0, today: { am_done: false, pm_done: false } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [r, p, s] = await Promise.all([
          api.get("/routine"),
          api.get("/profile"),
          api.get("/routine/streak"),
        ]);
        setRoutine(r.data.routine);
        setProfile(p.data.profile);
        setStreak(s.data);
      } catch (e) {
        if (e.response?.status === 401) {
          nav("/login", { replace: true });
          return;
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] grid place-items-center bg-[#F9F8F5]">
        <span className="text-xs tracking-[0.2em] uppercase text-[#2B3024]/60">Loading</span>
      </div>
    );
  }

  const greetName = user?.name || (user?.email ? user.email.split("@")[0] : "there");
  const amSteps = (routine?.steps || []).filter((s) => s.time_of_day === "am");
  const pmSteps = (routine?.steps || []).filter((s) => s.time_of_day === "pm");

  return (
    <div className="min-h-[100dvh] bg-[#F9F8F5]" data-testid="dashboard-page">
      <TopBar />

      <div className="px-6 pt-4 pb-20 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <span className="text-xs tracking-[0.28em] uppercase font-bold text-[#7A8271]">Welcome</span>
          <h1
            className="mt-3 font-serif italic text-4xl sm:text-5xl text-[#2B3024]"
            data-testid="dashboard-greeting"
          >
            Hello, {greetName}.
          </h1>
          {routine && (
            <p className="mt-3 text-[#2B3024]/70">
              Tick each step as you go — your list resets on your next visit.
            </p>
          )}
          {routine && (
            <div className="mt-6 inline-flex items-center gap-3 rounded-full bg-white px-5 py-3 shadow-[0_6px_24px_rgba(43,48,36,0.06)] border border-[#2B3024]/8" data-testid="dashboard-streak">
              <span className="w-8 h-8 rounded-full bg-[#F3E8E0] text-[#2B3024] grid place-items-center">
                <Flame className="w-4 h-4" strokeWidth={1.6} />
              </span>
              <div>
                <p className="text-[10px] tracking-[0.22em] uppercase font-bold text-[#2B3024]/60">
                  Streak
                </p>
                <p className="text-sm text-[#2B3024]">
                  <span className="font-serif italic text-lg" data-testid="dashboard-streak-count">
                    {streak.streak}
                  </span>{" "}
                  {streak.streak === 1 ? "day" : "days"}
                </p>
              </div>
              <div className="ml-4 pl-4 border-l border-[#2B3024]/10 flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase font-bold">
                <span className={`inline-flex items-center gap-1 ${streak.today?.am_done ? "text-[#2B3024]" : "text-[#2B3024]/30"}`} data-testid="dashboard-today-am">
                  <Sun className="w-3 h-3" strokeWidth={1.6} /> AM
                </span>
                <span className={`inline-flex items-center gap-1 ${streak.today?.pm_done ? "text-[#2B3024]" : "text-[#2B3024]/30"}`} data-testid="dashboard-today-pm">
                  <Moon className="w-3 h-3" strokeWidth={1.6} /> PM
                </span>
              </div>
            </div>
          )}
        </motion.div>

        {!routine ? (
          <div
            className="mt-10 bg-white rounded-3xl p-8 shadow-[0_8px_32px_rgba(43,48,36,0.06)]"
            data-testid="dashboard-empty-state"
          >
            <p className="font-serif italic text-2xl text-[#2B3024]">
              You haven&apos;t built your ritual yet.
            </p>
            <p className="mt-2 text-[#2B3024]/70">It takes about two minutes.</p>
            <Link
              to="/quiz"
              data-testid="dashboard-start-quiz-btn"
              className="mt-6 inline-flex items-center gap-3 rounded-full bg-[#2B3024] px-8 py-4 text-[#F9F8F5] text-sm tracking-wide font-medium hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(43,48,36,0.18)]"
            >
              Take the quiz
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-10 grid md:grid-cols-2 gap-6">
              <DashboardChecklist
                title="Morning"
                icon={Sun}
                steps={amSteps}
                bg="bg-white shadow-[0_8px_32px_rgba(43,48,36,0.06)]"
                chipBg="bg-[#F3E8E0]"
              />
              <DashboardChecklist
                title="Evening"
                icon={Moon}
                steps={pmSteps}
                bg="bg-[#D2D9C5]"
                chipBg="bg-white/70"
              />
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <button
                onClick={() => nav("/result")}
                data-testid="dashboard-view-full-btn"
                className="rounded-full bg-[#2B3024] text-[#F9F8F5] px-6 py-3 text-sm tracking-wide font-medium hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(43,48,36,0.18)] inline-flex items-center gap-2"
              >
                Open full checklist <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.8} />
              </button>
              <Link
                to="/quiz"
                data-testid="dashboard-retake-btn"
                className="rounded-full border border-[#2B3024]/20 text-[#2B3024] px-6 py-3 text-sm tracking-wide font-medium hover:border-[#2B3024]/60 inline-flex items-center gap-2"
              >
                <RefreshCcw className="w-3.5 h-3.5" strokeWidth={1.6} />
                Retake quiz
              </Link>
              <Link
                to="/chat"
                data-testid="dashboard-chat-link"
                className="rounded-full border border-[#2B3024]/20 text-[#2B3024] px-6 py-3 text-sm tracking-wide font-medium hover:border-[#2B3024]/60 inline-flex items-center gap-2"
              >
                <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.6} />
                Ask the assistant
              </Link>
              <Link
                to="/progress"
                data-testid="dashboard-progress-link"
                className="rounded-full border border-[#2B3024]/20 text-[#2B3024] px-6 py-3 text-sm tracking-wide font-medium hover:border-[#2B3024]/60 inline-flex items-center gap-2"
              >
                <TrendingUp className="w-3.5 h-3.5" strokeWidth={1.6} />
                Progress
              </Link>
              <Link
                to="/check"
                data-testid="dashboard-check-link"
                className="rounded-full border border-[#2B3024]/20 text-[#2B3024] px-6 py-3 text-sm tracking-wide font-medium hover:border-[#2B3024]/60 inline-flex items-center gap-2"
              >
                <FlaskConical className="w-3.5 h-3.5" strokeWidth={1.6} />
                Check ingredients
              </Link>
              <Link
                to="/settings"
                data-testid="dashboard-settings-link"
                className="rounded-full border border-[#2B3024]/20 text-[#2B3024] px-6 py-3 text-sm tracking-wide font-medium hover:border-[#2B3024]/60 inline-flex items-center gap-2"
              >
                <SettingsIcon className="w-3.5 h-3.5" strokeWidth={1.6} />
                Profile
              </Link>
            </div>

            {profile && (
              <div className="mt-10 text-xs tracking-[0.14em] uppercase text-[#2B3024]/50">
                Skin: {profile.skin_type} · {profile.budget} · {profile.age_range}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
