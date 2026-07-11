import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sun, Moon, ArrowRight, Bookmark } from "lucide-react";
import { api } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { toast } from "sonner";

function StepCard({ step, index }) {
  const hero = step.examples?.[0]?.image_url;
  return (
    <motion.li
      variants={{
        hidden: { opacity: 0, scale: 0.96, y: 8 },
        show: { opacity: 1, scale: 1, y: 0 },
      }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-white rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(43,48,36,0.06)]"
      data-testid={`routine-step-${step.step}`}
    >
      {hero && (
        <div className="w-full h-40 bg-[#F3E8E0] overflow-hidden">
          <img
            src={hero}
            alt={step.examples[0].name}
            loading="lazy"
            className="w-full h-full object-cover"
            data-testid={`routine-step-${step.step}-image`}
          />
        </div>
      )}
      <div className="p-6">
        <div className="flex items-center gap-4">
          <span className="w-10 h-10 rounded-full bg-[#F3E8E0] text-[#2B3024] font-serif italic text-lg grid place-items-center">
            {index + 1}
          </span>
          <div>
            <p className="text-xs tracking-[0.2em] uppercase font-bold text-[#7A8271]">Step {index + 1}</p>
            <p className="font-serif italic text-2xl text-[#2B3024] leading-tight">{step.label}</p>
          </div>
        </div>
        <p className="mt-4 text-[#2B3024]/75 leading-relaxed">{step.why}</p>

        {step.examples?.length > 0 && (
          <div className="mt-5 pt-5 border-t border-[#2B3024]/8 space-y-4">
            {step.examples.map((p, i) => (
              <div key={i} className="flex items-start gap-4">
                {p.image_url && (
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[#F3E8E0] flex-shrink-0">
                    <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-[#2B3024] leading-snug">{p.name}</p>
                  <p className="text-xs tracking-[0.14em] uppercase text-[#2B3024]/50 mt-1">
                    {p.brand} · {p.budget_tier}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.li>
  );
}

export default function Result() {
  const { state } = useLocation();
  const nav = useNavigate();
  const [routine, setRoutine] = useState(state?.routine || null);
  const [loading, setLoading] = useState(!routine);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (routine) return;
    (async () => {
      try {
        const { data } = await api.get("/routine");
        if (data.routine) setRoutine(data.routine);
        else nav("/quiz");
      } catch {
        nav("/quiz");
      } finally {
        setLoading(false);
      }
    })();
  }, [routine, nav]);

  const save = () => {
    // Already saved server-side at /routine/generate; this is UX confirmation.
    setSaved(true);
    toast.success("Ritual saved to your profile");
    setTimeout(() => nav("/dashboard"), 700);
  };

  if (loading || !routine) {
    return (
      <div className="min-h-[100dvh] grid place-items-center bg-[#D2D9C5]">
        <span className="text-xs tracking-[0.2em] uppercase text-[#2B3024]/60">Preparing your ritual</span>
      </div>
    );
  }

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };

  return (
    <div className="min-h-[100dvh] bg-[#D2D9C5]" data-testid="result-page">
      <TopBar />

      <div className="px-6 pt-4 pb-24 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-xs tracking-[0.28em] uppercase font-bold text-[#2B3024]/70">Your ritual</span>
          <h1 className="mt-4 font-serif italic text-4xl sm:text-5xl text-[#2B3024] leading-tight" data-testid="result-heading">
            Built for you.
          </h1>
          <p className="mt-3 text-[#2B3024]/70 max-w-lg">
            Two moments a day. Four purposeful steps in the morning, three at night. Simple. Consistent.
          </p>
        </motion.div>

        <div className="mt-10 grid md:grid-cols-2 gap-8">
          <section>
            <div className="flex items-center gap-3">
              <Sun className="w-5 h-5 text-[#2B3024]" strokeWidth={1.5} />
              <h2 className="font-serif italic text-2xl text-[#2B3024]">Morning</h2>
            </div>
            <motion.ul variants={container} initial="hidden" animate="show" className="mt-5 space-y-4">
              {routine.am_steps.map((s, i) => (
                <StepCard key={`am-${i}`} step={s} index={i} />
              ))}
            </motion.ul>
          </section>

          <section>
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-[#2B3024]" strokeWidth={1.5} />
              <h2 className="font-serif italic text-2xl text-[#2B3024]">Evening</h2>
            </div>
            <motion.ul variants={container} initial="hidden" animate="show" className="mt-5 space-y-4">
              {routine.pm_steps.map((s, i) => (
                <StepCard key={`pm-${i}`} step={s} index={i} />
              ))}
            </motion.ul>
          </section>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4">
          <button
            onClick={save}
            disabled={saved}
            data-testid="result-save-btn"
            className="rounded-full bg-[#2B3024] text-[#F9F8F5] px-10 py-4 text-sm tracking-wide font-medium hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(43,48,36,0.18)] inline-flex items-center gap-3 disabled:opacity-70"
          >
            <Bookmark className="w-4 h-4" strokeWidth={1.8} />
            {saved ? "Saved" : "Save my routine"}
          </button>
          <Link
            to="/dashboard"
            data-testid="result-dashboard-link"
            className="text-sm text-[#2B3024]/70 hover:text-[#2B3024] underline underline-offset-4 inline-flex items-center gap-2"
          >
            Skip to dashboard <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.8} />
          </Link>
        </div>
      </div>
    </div>
  );
}
