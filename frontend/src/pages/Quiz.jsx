import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { SkinPhotoStep } from "@/components/SkinPhotoStep";
import { toast } from "sonner";

const STEPS = [
  {
    key: "skin_type",
    title: "How does your skin usually feel?",
    kind: "single",
    options: [
      { v: "oily", label: "Oily", note: "Shiny by midday, prone to congestion." },
      { v: "dry", label: "Dry", note: "Tight, sometimes flaky, dull." },
      { v: "combination", label: "Combination", note: "Oily T-zone, drier cheeks." },
      { v: "normal", label: "Normal", note: "Balanced, few complaints." },
      { v: "sensitive", label: "Sensitive", note: "Reacts easily to products." },
    ],
  },
  {
    key: "concerns",
    title: "What are your top concerns?",
    subtitle: "Pick up to three.",
    kind: "multi",
    max: 3,
    options: [
      { v: "acne", label: "Acne / breakouts" },
      { v: "dark spots", label: "Dark spots" },
      { v: "fine lines", label: "Fine lines" },
      { v: "redness", label: "Redness" },
      { v: "dullness", label: "Dullness" },
      { v: "large pores", label: "Large pores" },
    ],
  },
  {
    key: "allergies",
    title: "Any ingredients to avoid?",
    subtitle: "Optional. Separate with commas.",
    kind: "text",
    placeholder: "e.g. fragrance, essential oils, alcohol",
  },
  {
    key: "current_routine_level",
    title: "Where are you right now?",
    kind: "single",
    options: [
      { v: "none", label: "Nothing yet", note: "Starting from scratch." },
      { v: "basic", label: "Basic", note: "Cleanser + moisturizer." },
      { v: "advanced", label: "Advanced", note: "Multi-step, includes actives." },
    ],
  },
  {
    key: "age_range",
    title: "Your age range?",
    kind: "single",
    options: [
      { v: "under-20", label: "Under 20" },
      { v: "20-29", label: "20 – 29" },
      { v: "30-39", label: "30 – 39" },
      { v: "40-49", label: "40 – 49" },
      { v: "50-plus", label: "50 +" },
    ],
  },
  {
    key: "budget",
    title: "Budget preference?",
    kind: "single",
    options: [
      { v: "drugstore", label: "Drugstore", note: "Affordable, effective staples." },
      { v: "mid-range", label: "Mid-range", note: "Balanced quality and price." },
      { v: "premium", label: "Premium", note: "Best-in-class, no compromises." },
    ],
  },
];

const INITIAL = {
  skin_type: "",
  concerns: [],
  allergies: "",
  current_routine_level: "",
  age_range: "",
  budget: "",
};

export default function Quiz() {
  const nav = useNavigate();
  const [phase, setPhase] = useState("intro"); // intro | quiz
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const step = STEPS[idx];
  const total = STEPS.length;

  // Prefill from server if profile exists
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/profile");
        if (data.profile) {
          setAnswers({
            skin_type: data.profile.skin_type || "",
            concerns: data.profile.concerns || [],
            allergies: data.profile.allergies || "",
            current_routine_level: data.profile.current_routine_level || "",
            age_range: data.profile.age_range || "",
            budget: data.profile.budget || "",
          });
          // Existing profile → skip AI intro and go straight to quiz for edits
          setPhase("quiz");
        }
      } catch {
        /* no existing profile */
      }
    })();
  }, []);

  const applyAiAnalysis = (result) => {
    setAnswers((prev) => ({
      ...prev,
      skin_type: result.skin_type || prev.skin_type,
      concerns: (result.concerns || []).slice(0, 3),
    }));
    setPhase("quiz");
    toast.success("Photo read — verify the rest of your answers");
  };

  const skipPhoto = () => setPhase("quiz");

  const canProceed = () => {
    const val = answers[step.key];
    if (step.kind === "single") return !!val;
    if (step.kind === "multi") return true; // allow zero concerns
    if (step.kind === "text") return true;
    return false;
  };

  const next = async () => {
    if (idx < total - 1) {
      setIdx(idx + 1);
      return;
    }
    // final -> submit
    setSubmitting(true);
    try {
      const payload = { ...answers };
      const { data } = await api.post("/routine/generate", payload);
      // stash last routine in sessionStorage for instant paint
      sessionStorage.setItem("le_rituel_last_routine", JSON.stringify(data.routine));
      nav("/result", { state: { routine: data.routine, fresh: true } });
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const back = () => {
    if (idx === 0) nav(-1);
    else setIdx(idx - 1);
  };

  const setSingle = (v) => setAnswers({ ...answers, [step.key]: v });
  const toggleMulti = (v) => {
    const cur = answers[step.key] || [];
    if (cur.includes(v)) {
      setAnswers({ ...answers, [step.key]: cur.filter((x) => x !== v) });
    } else if (cur.length < (step.max || 3)) {
      setAnswers({ ...answers, [step.key]: [...cur, v] });
    }
  };

  const progress = ((idx + 1) / total) * 100;

  if (phase === "intro") {
    return (
      <div className="min-h-[100dvh] bg-[#F9F8F5]" data-testid="quiz-page">
        <TopBar showLogout={false} />
        <div className="px-6 pt-4 pb-24 max-w-md mx-auto">
          <SkinPhotoStep onDone={applyAiAnalysis} onSkip={skipPhoto} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#F9F8F5]" data-testid="quiz-page">
      <TopBar showLogout={false} />

      {/* Progress bar */}
      <div className="px-6 max-w-md mx-auto">
        <div className="flex items-center justify-between text-xs tracking-[0.2em] uppercase text-[#2B3024]/60">
          <span data-testid="quiz-step-counter">
            {String(idx + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <button
            onClick={back}
            data-testid="quiz-back-btn"
            className="inline-flex items-center gap-2 hover:text-[#2B3024]"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
            Back
          </button>
        </div>
        <div className="mt-4 h-[3px] w-full bg-[#2B3024]/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#2B3024] rounded-full"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="px-6 pt-10 pb-24 max-w-md mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="font-serif italic text-3xl sm:text-4xl leading-tight text-[#2B3024]" data-testid="quiz-question-title">
              {step.title}
            </h2>
            {step.subtitle && (
              <p className="mt-2 text-sm text-[#2B3024]/60">{step.subtitle}</p>
            )}

            <div className="mt-8 flex flex-col gap-3">
              {step.kind === "single" &&
                step.options.map((o) => {
                  const active = answers[step.key] === o.v;
                  return (
                    <button
                      key={o.v}
                      onClick={() => setSingle(o.v)}
                      data-testid={`quiz-option-${step.key}-${o.v}`}
                      className={`text-left rounded-2xl px-5 py-4 border transition-colors ${
                        active
                          ? "bg-[#2B3024] text-[#F9F8F5] border-[#2B3024]"
                          : "bg-white border-[#2B3024]/10 text-[#2B3024] hover:border-[#2B3024]/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{o.label}</span>
                        {active && <Check className="w-4 h-4" strokeWidth={2} />}
                      </div>
                      {o.note && (
                        <p className={`mt-1 text-sm ${active ? "text-[#F9F8F5]/70" : "text-[#2B3024]/60"}`}>
                          {o.note}
                        </p>
                      )}
                    </button>
                  );
                })}

              {step.kind === "multi" &&
                step.options.map((o) => {
                  const active = (answers[step.key] || []).includes(o.v);
                  return (
                    <button
                      key={o.v}
                      onClick={() => toggleMulti(o.v)}
                      data-testid={`quiz-option-${step.key}-${o.v.replace(/\s+/g, "-")}`}
                      className={`text-left rounded-2xl px-5 py-4 border transition-colors flex items-center justify-between ${
                        active
                          ? "bg-[#2B3024] text-[#F9F8F5] border-[#2B3024]"
                          : "bg-white border-[#2B3024]/10 text-[#2B3024] hover:border-[#2B3024]/30"
                      }`}
                    >
                      <span className="font-medium">{o.label}</span>
                      {active && <Check className="w-4 h-4" strokeWidth={2} />}
                    </button>
                  );
                })}

              {step.kind === "text" && (
                <textarea
                  value={answers[step.key] || ""}
                  onChange={(e) => setAnswers({ ...answers, [step.key]: e.target.value })}
                  placeholder={step.placeholder}
                  data-testid="quiz-allergies-input"
                  rows={4}
                  maxLength={500}
                  className="rounded-2xl bg-white border border-[#2B3024]/10 px-5 py-4 text-[#2B3024] focus:ring-2 focus:ring-[#2B3024]/20 focus:outline-none resize-none"
                />
              )}
            </div>

            <button
              onClick={next}
              disabled={!canProceed() || submitting}
              data-testid="quiz-next-btn"
              className="mt-10 w-full rounded-full bg-[#2B3024] text-[#F9F8F5] py-4 text-sm tracking-wide font-medium hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(43,48,36,0.18)] disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none inline-flex items-center justify-center gap-3"
            >
              {submitting ? "Building your ritual..." : idx === total - 1 ? "Reveal my ritual" : "Continue"}
              {!submitting && <ArrowRight className="w-4 h-4" strokeWidth={1.8} />}
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
