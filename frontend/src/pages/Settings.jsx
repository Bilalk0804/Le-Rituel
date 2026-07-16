import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Download, Trash2, ArrowLeft, Bell, BellOff } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reminders, setReminders] = useState({ enabled: false, am_time: "07:30", pm_time: "22:00" });
  const [savingReminders, setSavingReminders] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: p }, { data: r }] = await Promise.all([
          api.get("/profile"),
          api.get("/settings/reminders"),
        ]);
        setProfile(p.profile);
        setReminders(r.reminders);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const saveReminders = async (next) => {
    setSavingReminders(true);
    try {
      // If enabling for the first time, prompt for Notification permission —
      // the browser will fall back to the in-app banner if the user declines.
      if (next.enabled && typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "default") {
          try {
            await Notification.requestPermission();
          } catch {
            /* older browsers */
          }
        }
      }
      const { data } = await api.put("/settings/reminders", next);
      setReminders(data.reminders);
      toast.success(next.enabled ? "Reminders on" : "Reminders off");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Save failed");
    } finally {
      setSavingReminders(false);
    }
  };

  const exportData = async () => {
    try {
      const { data } = await api.get("/account/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `le-rituel-${user?.email || "data"}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported");
    } catch (e) {
      toast.error("Export failed");
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await api.delete("/account");
      toast.success("Account deleted");
      // Force full navigation to landing BEFORE clearing auth state so
      // ProtectedRoute doesn't race us to /login.
      window.location.replace("/");
    } catch (e) {
      toast.error("Delete failed");
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#F9F8F5]" data-testid="settings-page">
      <TopBar />

      <div className="px-6 pt-4 pb-20 max-w-2xl mx-auto">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-[#2B3024]/60 hover:text-[#2B3024]"
          data-testid="settings-back-link"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.6} />
          Back to dashboard
        </Link>

        <h1 className="mt-6 font-serif italic text-4xl text-[#2B3024]" data-testid="settings-heading">
          Your profile
        </h1>

        <section className="mt-10 bg-white rounded-3xl p-7 shadow-[0_8px_32px_rgba(43,48,36,0.06)]">
          <p className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/60">Account</p>
          <p className="mt-3 font-medium text-[#2B3024]">{user?.email}</p>
          {user?.name && <p className="text-[#2B3024]/70">{user.name}</p>}
        </section>

        <section className="mt-6 bg-white rounded-3xl p-7 shadow-[0_8px_32px_rgba(43,48,36,0.06)]" data-testid="settings-reminders">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/60">Reminders</p>
              <p className="mt-2 text-sm text-[#2B3024]/70">
                A soft in-app banner at your chosen times. If you allow browser notifications, we&apos;ll add a native one too.
              </p>
            </div>
            <button
              type="button"
              onClick={() => saveReminders({ ...reminders, enabled: !reminders.enabled })}
              disabled={savingReminders}
              aria-label={reminders.enabled ? "Turn reminders off" : "Turn reminders on"}
              data-testid="settings-reminders-toggle"
              className={`relative w-12 h-7 rounded-full flex-shrink-0 transition-colors ${reminders.enabled ? "bg-[#2B3024]" : "bg-[#2B3024]/20"}`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-[#F9F8F5] transition-transform ${reminders.enabled ? "translate-x-5" : "translate-x-0"}`}
              />
            </button>
          </div>

          <div className={`mt-6 grid grid-cols-2 gap-4 ${reminders.enabled ? "" : "opacity-40 pointer-events-none"}`}>
            <label className="block">
              <span className="text-[10px] tracking-[0.24em] uppercase font-bold text-[#2B3024]/60">Morning</span>
              <input
                type="time"
                value={reminders.am_time}
                onChange={(e) => setReminders((r) => ({ ...r, am_time: e.target.value }))}
                onBlur={() => saveReminders(reminders)}
                data-testid="settings-reminders-am"
                className="mt-2 w-full rounded-2xl bg-[#F9F8F5] border border-[#2B3024]/10 px-4 py-3 text-[#2B3024] focus:ring-2 focus:ring-[#2B3024]/20 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[10px] tracking-[0.24em] uppercase font-bold text-[#2B3024]/60">Evening</span>
              <input
                type="time"
                value={reminders.pm_time}
                onChange={(e) => setReminders((r) => ({ ...r, pm_time: e.target.value }))}
                onBlur={() => saveReminders(reminders)}
                data-testid="settings-reminders-pm"
                className="mt-2 w-full rounded-2xl bg-[#F9F8F5] border border-[#2B3024]/10 px-4 py-3 text-[#2B3024] focus:ring-2 focus:ring-[#2B3024]/20 focus:outline-none"
              />
            </label>
          </div>
          {reminders.enabled && typeof window !== "undefined" && "Notification" in window && Notification.permission === "denied" && (
            <p className="mt-4 text-xs text-[#2B3024]/60 inline-flex items-center gap-2">
              <BellOff className="w-3.5 h-3.5" strokeWidth={1.6} />
              Browser notifications are blocked — we&apos;ll still show the in-app banner.
            </p>
          )}
        </section>

        <section className="mt-6 bg-white rounded-3xl p-7 shadow-[0_8px_32px_rgba(43,48,36,0.06)]">
          <p className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/60">Skin profile</p>
          {profile ? (
            <dl className="mt-4 grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
              <dt className="text-[#2B3024]/60">Skin type</dt>
              <dd className="text-[#2B3024]">{profile.skin_type}</dd>
              <dt className="text-[#2B3024]/60">Concerns</dt>
              <dd className="text-[#2B3024]">{(profile.concerns || []).join(", ") || "—"}</dd>
              <dt className="text-[#2B3024]/60">Allergies</dt>
              <dd className="text-[#2B3024]">{profile.allergies || "—"}</dd>
              <dt className="text-[#2B3024]/60">Age</dt>
              <dd className="text-[#2B3024]">{profile.age_range}</dd>
              <dt className="text-[#2B3024]/60">Budget</dt>
              <dd className="text-[#2B3024]">{profile.budget}</dd>
              <dt className="text-[#2B3024]/60">Current routine</dt>
              <dd className="text-[#2B3024]">{profile.current_routine_level}</dd>
            </dl>
          ) : (
            <p className="mt-3 text-[#2B3024]/60">No profile yet.</p>
          )}
          <div className="mt-6">
            <Link
              to="/quiz"
              data-testid="settings-edit-profile-btn"
              className="rounded-full bg-[#2B3024] text-[#F9F8F5] px-6 py-3 text-sm font-medium hover:-translate-y-0.5 inline-flex"
            >
              Edit skin profile
            </Link>
          </div>
        </section>

        <section className="mt-6 bg-white rounded-3xl p-7 shadow-[0_8px_32px_rgba(43,48,36,0.06)]">
          <p className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/60">Data & privacy</p>
          <div className="mt-5 space-y-3">
            <button
              onClick={exportData}
              data-testid="settings-export-btn"
              className="w-full rounded-2xl border border-[#2B3024]/20 px-5 py-4 flex items-center justify-between hover:border-[#2B3024]/50 text-[#2B3024]"
            >
              <span className="font-medium">Export my data</span>
              <Download className="w-4 h-4" strokeWidth={1.6} />
            </button>

            {!confirming ? (
              <button
                onClick={() => setConfirming(true)}
                data-testid="settings-delete-init-btn"
                className="w-full rounded-2xl border border-[#a03636]/30 text-[#a03636] px-5 py-4 flex items-center justify-between hover:border-[#a03636]/60"
              >
                <span className="font-medium">Delete my account</span>
                <Trash2 className="w-4 h-4" strokeWidth={1.6} />
              </button>
            ) : (
              <div className="rounded-2xl bg-[#F3E8E0] p-5" data-testid="settings-delete-confirm">
                <p className="text-[#2B3024] font-medium">Delete permanently?</p>
                <p className="mt-1 text-sm text-[#2B3024]/70">
                  All your data — profile, routines, account — will be removed. This cannot be undone.
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={deleteAccount}
                    disabled={deleting}
                    data-testid="settings-delete-confirm-btn"
                    className="flex-1 rounded-full bg-[#a03636] text-white py-3 text-sm font-medium hover:opacity-90 disabled:opacity-60"
                  >
                    {deleting ? "Deleting..." : "Yes, delete"}
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    data-testid="settings-delete-cancel-btn"
                    className="flex-1 rounded-full border border-[#2B3024]/20 py-3 text-sm text-[#2B3024]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
