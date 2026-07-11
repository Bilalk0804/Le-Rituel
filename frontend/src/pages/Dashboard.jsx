import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sun, Moon, RefreshCcw, Settings as SettingsIcon } from "lucide-react";
import { api } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [routine, setRoutine] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [r, p] = await Promise.all([api.get("/routine"), api.get("/profile")]);
        setRoutine(r.data.routine);
        setProfile(p.data.profile);
      } catch (e) {
        if (e.response?.status === 401) {
          // Session expired — bounce to login.
          nav("/login", { replace: true });
          return;
        }
        // Other errors: leave routine/profile as null so the empty state renders.
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

  return (
    <div className="min-h-[100dvh] bg-[#F9F8F5]" data-testid="dashboard-page">
      <TopBar />

      <div className="px-6 pt-4 pb-20 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <span className="text-xs tracking-[0.28em] uppercase font-bold text-[#7A8271]">Welcome</span>
          <h1 className="mt-3 font-serif italic text-4xl sm:text-5xl text-[#2B3024]" data-testid="dashboard-greeting">
            Hello, {greetName}.
          </h1>
        </motion.div>

        {!routine ? (
          <div className="mt-10 bg-white rounded-3xl p-8 shadow-[0_8px_32px_rgba(43,48,36,0.06)]" data-testid="dashboard-empty-state">
            <p className="font-serif italic text-2xl text-[#2B3024]">You haven&apos;t built your ritual yet.</p>
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
              <div className="bg-white rounded-3xl p-7 shadow-[0_8px_32px_rgba(43,48,36,0.06)]">
                <div className="flex items-center gap-3">
                  <Sun className="w-4 h-4 text-[#2B3024]" strokeWidth={1.6} />
                  <p className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/60">Morning</p>
                </div>
                <ol className="mt-5 space-y-3">
                  {routine.am_steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 w-6 h-6 rounded-full bg-[#F3E8E0] text-[#2B3024] text-xs font-medium grid place-items-center">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-[#2B3024] font-medium">{s.label}</p>
                        {s.examples?.[0] && (
                          <p className="text-xs text-[#2B3024]/60 mt-0.5">{s.examples[0].name}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="bg-[#D2D9C5] rounded-3xl p-7">
                <div className="flex items-center gap-3">
                  <Moon className="w-4 h-4 text-[#2B3024]" strokeWidth={1.6} />
                  <p className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/70">Evening</p>
                </div>
                <ol className="mt-5 space-y-3">
                  {routine.pm_steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 w-6 h-6 rounded-full bg-white/70 text-[#2B3024] text-xs font-medium grid place-items-center">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-[#2B3024] font-medium">{s.label}</p>
                        {s.examples?.[0] && (
                          <p className="text-xs text-[#2B3024]/70 mt-0.5">{s.examples[0].name}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <button
                onClick={() => nav("/result")}
                data-testid="dashboard-view-full-btn"
                className="rounded-full bg-[#2B3024] text-[#F9F8F5] px-6 py-3 text-sm tracking-wide font-medium hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(43,48,36,0.18)]"
              >
                View full ritual
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
