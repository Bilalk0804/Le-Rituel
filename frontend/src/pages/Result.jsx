import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sun, Moon, Bookmark, Check, Pencil, Home, Sparkles } from "lucide-react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { todayISO } from "@/components/ReminderBanner";
import { toast } from "sonner";

const CATEGORY_META = {
  cleanser: { label: "Cleanser", accent: "#D2D9C5" },
  serum: { label: "Serum", accent: "#F3E8E0" },
  moisturizer: { label: "Moisturizer", accent: "#EDE4D5" },
  sunscreen: { label: "Sunscreen", accent: "#F5D9B2" },
  retinol: { label: "Retinol", accent: "#D9C7BC" },
};

function StepRow({ step, onSave }) {
  const meta = CATEGORY_META[step.product_category] || {
    label: step.product_category,
    accent: "#F3E8E0",
  };
  const [checked, setChecked] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(step.product_name || "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setDraft(step.product_name || "");
  }, [step.product_name]);

  const startEdit = () => {
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const commit = async () => {
    const next = draft.trim();
    if (next === (step.product_name || "")) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      toast.success("Saved");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Save failed");
      setDraft(step.product_name || "");
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const stepTestId = `step-${step.time_of_day}-${step.step_order}`;
  const hero = step.suggestions?.[0]?.image_url;

  return (
    <motion.li
      variants={{
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`bg-white rounded-3xl px-5 py-4 shadow-[0_6px_24px_rgba(43,48,36,0.05)] flex items-start gap-4 transition-opacity ${
        checked ? "opacity-60" : "opacity-100"
      }`}
      data-testid={stepTestId}
    >
      <button
        onClick={() => setChecked((c) => !c)}
        aria-label={checked ? "Mark as not done" : "Mark as done"}
        data-testid={`${stepTestId}-check`}
        className={`mt-0.5 w-7 h-7 rounded-full border-2 flex-shrink-0 grid place-items-center transition-colors ${
          checked
            ? "bg-[#2B3024] border-[#2B3024] text-[#F9F8F5]"
            : "bg-white border-[#2B3024]/25 hover:border-[#2B3024]/60"
        }`}
      >
        {checked && <Check className="w-4 h-4" strokeWidth={2.4} />}
      </button>

      {hero && (
        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[#F3E8E0] flex-shrink-0">
          <img
            src={hero}
            alt={step.product_name}
            loading="lazy"
            className={`w-full h-full object-cover ${checked ? "grayscale" : ""}`}
          />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] tracking-[0.22em] uppercase font-bold text-[#2B3024]"
            style={{ backgroundColor: meta.accent }}
          >
            {String(step.step_order).padStart(2, "0")} · {meta.label}
          </span>
        </div>

        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(step.product_name || "");
                setEditing(false);
              }
            }}
            disabled={saving}
            data-testid={`${stepTestId}-input`}
            placeholder="Product name..."
            className="mt-2 w-full font-medium text-[#2B3024] bg-transparent border-b border-[#2B3024]/30 focus:border-[#2B3024] focus:outline-none pb-1"
          />
        ) : (
          <button
            onClick={startEdit}
            data-testid={`${stepTestId}-edit-btn`}
            className={`mt-1.5 text-left w-full inline-flex items-baseline gap-2 group ${
              checked ? "line-through" : ""
            }`}
          >
            <span className="font-medium text-[#2B3024] leading-snug">
              {step.product_name || (
                <span className="text-[#2B3024]/40 italic">Tap to add a product</span>
              )}
            </span>
            <Pencil className="w-3 h-3 text-[#2B3024]/40 group-hover:text-[#2B3024]/80" strokeWidth={1.6} />
          </button>
        )}

        {step.why && !checked && (
          <p className="mt-2 text-sm text-[#2B3024]/65 leading-relaxed">{step.why}</p>
        )}
      </div>
    </motion.li>
  );
}

function ChecklistSection({ title, icon: Icon, steps, onUpdateStep, testid, done, onMarkDone, timeKey }) {
  const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
  return (
    <section data-testid={testid}>
      <div className="flex items-center gap-3 flex-wrap">
        <Icon className="w-5 h-5 text-[#2B3024]" strokeWidth={1.5} />
        <h2 className="font-serif italic text-2xl text-[#2B3024]">{title}</h2>
        <span className="text-xs tracking-[0.2em] uppercase text-[#2B3024]/50 ml-1">
          {steps.length} steps
        </span>
        {done && (
          <span
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#2B3024] text-[#F9F8F5] px-3 py-1 text-[10px] tracking-[0.22em] uppercase font-bold"
            data-testid={`${testid}-done-badge`}
          >
            <Check className="w-3 h-3" strokeWidth={2.4} />
            Done today
          </span>
        )}
      </div>
      <motion.ol variants={container} initial="hidden" animate="show" className="mt-5 space-y-3">
        {steps.map((s) => (
          <StepRow
            key={`${s.time_of_day}-${s.step_order}`}
            step={s}
            onSave={(name) => onUpdateStep(s, name)}
          />
        ))}
      </motion.ol>
      <button
        onClick={() => onMarkDone(!done)}
        data-testid={`${testid}-mark-done-btn`}
        className={`mt-5 w-full rounded-full py-3 text-sm tracking-wide font-medium transition-colors ${
          done
            ? "bg-white border border-[#2B3024]/25 text-[#2B3024]/70 hover:bg-[#2B3024]/5"
            : "bg-[#2B3024] text-[#F9F8F5] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(43,48,36,0.18)]"
        }`}
      >
        {done ? `Undo ${timeKey === "am" ? "morning" : "evening"} completion` : `I did my ${timeKey === "am" ? "morning" : "evening"} ritual`}
      </button>
    </section>
  );
}

export default function Result() {
  const { state } = useLocation();
  const nav = useNavigate();
  const [routine, setRoutine] = useState(state?.routine || null);
  const [loading, setLoading] = useState(!routine);
  const [streak, setStreak] = useState({ streak: 0, today: { am_done: false, pm_done: false } });

  useEffect(() => {
    // Load persistent completion + streak whenever the page mounts.
    (async () => {
      try {
        const { data } = await api.get("/routine/streak");
        setStreak(data);
      } catch {
        /* silent */
      }
    })();
  }, []);

  const markDone = async (time_of_day, done) => {
    try {
      const { data } = await api.post("/routine/complete", {
        date: todayISO(),
        time_of_day,
        done,
      });
      setStreak(data);
      if (done) {
        toast.success(
          time_of_day === "am"
            ? "Morning ritual complete"
            : `Evening ritual complete${data.streak >= 2 ? ` — ${data.streak}-day streak` : ""}`
        );
      }
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Save failed");
    }
  };

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

  const updateStep = async (step, newName) => {
    const { data } = await api.patch("/routine/steps", {
      time_of_day: step.time_of_day,
      step_order: step.step_order,
      product_name: newName,
    });
    setRoutine(data.routine);
  };

  if (loading || !routine) {
    return (
      <div className="min-h-[100dvh] grid place-items-center bg-[#D2D9C5]">
        <span className="text-xs tracking-[0.2em] uppercase text-[#2B3024]/60">
          Preparing your ritual
        </span>
      </div>
    );
  }

  const amSteps = routine.steps.filter((s) => s.time_of_day === "am");
  const pmSteps = routine.steps.filter((s) => s.time_of_day === "pm");

  return (
    <div className="min-h-[100dvh] bg-[#D2D9C5]" data-testid="result-page">
      <TopBar />

      <div className="px-6 pt-4 pb-24 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="text-xs tracking-[0.28em] uppercase font-bold text-[#2B3024]/70">Your ritual</span>
          <h1
            className="mt-4 font-serif italic text-4xl sm:text-5xl text-[#2B3024] leading-tight"
            data-testid="result-heading"
          >
            Built for you.
          </h1>
          <p className="mt-3 text-[#2B3024]/70 max-w-lg">
            Tap a product name to swap in your own. Tick each step as you do it — the list resets on
            your next visit.
          </p>
          {streak.streak > 0 && (
            <p
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-4 py-2 border border-[#2B3024]/10 text-sm text-[#2B3024]"
              data-testid="result-streak-chip"
            >
              <Sparkles className="w-4 h-4" strokeWidth={1.6} />
              <span className="font-medium">{streak.streak}-day streak</span>
              <span className="text-[#2B3024]/60">— both routines done in a row</span>
            </p>
          )}
        </motion.div>

        {routine.ai_notes && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-8 rounded-3xl bg-white/70 backdrop-blur px-6 py-5 border border-[#2B3024]/10 max-w-xl"
            data-testid="result-ai-notes"
          >
            <p className="text-[10px] tracking-[0.28em] uppercase font-bold text-[#2B3024]/60">
              What we noticed
            </p>
            <p className="mt-2 font-serif italic text-lg text-[#2B3024] leading-snug">
              {routine.ai_notes}
            </p>
          </motion.div>
        )}

        <div className="mt-10 grid md:grid-cols-2 gap-10">
          <ChecklistSection
            title="Morning"
            icon={Sun}
            steps={amSteps}
            onUpdateStep={updateStep}
            testid="checklist-am"
            timeKey="am"
            done={streak.today?.am_done}
            onMarkDone={(next) => markDone("am", next)}
          />
          <ChecklistSection
            title="Evening"
            icon={Moon}
            steps={pmSteps}
            onUpdateStep={updateStep}
            testid="checklist-pm"
            timeKey="pm"
            done={streak.today?.pm_done}
            onMarkDone={(next) => markDone("pm", next)}
          />
        </div>

        <div className="mt-12 flex flex-col items-center gap-4">
          <button
            onClick={() => {
              toast.success("Ritual saved to your profile");
              setTimeout(() => nav("/dashboard"), 500);
            }}
            data-testid="result-save-btn"
            className="rounded-full bg-[#2B3024] text-[#F9F8F5] px-10 py-4 text-sm tracking-wide font-medium hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(43,48,36,0.18)] inline-flex items-center gap-3"
          >
            <Bookmark className="w-4 h-4" strokeWidth={1.8} />
            Save my routine
          </button>
          <Link
            to="/dashboard"
            data-testid="result-dashboard-link"
            className="text-sm text-[#2B3024]/70 hover:text-[#2B3024] underline underline-offset-4 inline-flex items-center gap-2"
          >
            <Home className="w-3.5 h-3.5" strokeWidth={1.8} /> Skip to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
