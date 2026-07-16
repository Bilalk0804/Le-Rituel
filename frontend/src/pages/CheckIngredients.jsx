import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, CheckCircle2, XCircle, HelpCircle, ArrowLeft } from "lucide-react";

const STATUS_STYLES = {
  safe: {
    icon: CheckCircle2,
    accent: "#D2D9C5",
    text: "#2B3024",
    ring: "border-[#8FA07A]/40",
  },
  avoid: {
    icon: XCircle,
    accent: "#F3D6C4",
    text: "#7A2E1A",
    ring: "border-[#C56B47]/40",
  },
  unknown: {
    icon: HelpCircle,
    accent: "#EDE4D5",
    text: "#2B3024",
    ring: "border-[#2B3024]/20",
  },
};

export default function CheckIngredients() {
  const [ingredients, setIngredients] = useState([]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/ingredients");
        setIngredients(data.ingredients || []);
      } catch {
        /* dropdown will fall back to free text */
      }
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const { data } = await api.post("/ingredients/check", {
        ingredient_a: a,
        ingredient_b: b,
      });
      setResult(data.result);
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const swap = () => {
    setA(b);
    setB(a);
  };

  const style = result ? STATUS_STYLES[result.status] : null;
  const StatusIcon = style?.icon;

  return (
    <div className="min-h-[100dvh] bg-[#F9F8F5]" data-testid="check-page">
      <TopBar />

      <div className="px-6 pt-4 pb-24 max-w-2xl mx-auto">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-[#2B3024]/60 hover:text-[#2B3024]"
          data-testid="check-back-link"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.6} />
          Back to dashboard
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#F3E8E0] px-3 py-1.5">
            <FlaskConical className="w-3.5 h-3.5 text-[#2B3024]" strokeWidth={1.6} />
            <span className="text-[10px] tracking-[0.24em] uppercase font-bold text-[#2B3024]">
              Conflict Check
            </span>
          </div>
          <h1
            className="mt-5 font-serif italic text-4xl sm:text-5xl leading-tight text-[#2B3024]"
            data-testid="check-heading"
          >
            Can these two mix?
          </h1>
          <p className="mt-3 text-[#2B3024]/70 max-w-lg">
            Pick or type any two active ingredients. We&apos;ll tell you if they&apos;re a smart
            pairing, a hard no, or something to space out through the day.
          </p>
        </motion.div>

        <datalist id="ingredient-options">
          {ingredients.map((i) => (
            <option key={i} value={i} />
          ))}
        </datalist>

        <form onSubmit={submit} className="mt-10 space-y-5">
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/60">
              First ingredient
            </label>
            <input
              type="text"
              required
              list="ingredient-options"
              value={a}
              onChange={(e) => setA(e.target.value)}
              placeholder="e.g. Retinol"
              autoComplete="off"
              data-testid="check-ingredient-a"
              className="mt-2 w-full rounded-2xl bg-white border border-[#2B3024]/10 px-5 py-4 text-[#2B3024] focus:ring-2 focus:ring-[#2B3024]/20 focus:outline-none"
            />
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={swap}
              data-testid="check-swap-btn"
              disabled={!a && !b}
              className="text-[10px] tracking-[0.24em] uppercase font-bold text-[#2B3024]/50 hover:text-[#2B3024] disabled:opacity-40"
            >
              swap ↕
            </button>
          </div>

          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/60">
              Second ingredient
            </label>
            <input
              type="text"
              required
              list="ingredient-options"
              value={b}
              onChange={(e) => setB(e.target.value)}
              placeholder="e.g. Vitamin C"
              autoComplete="off"
              data-testid="check-ingredient-b"
              className="mt-2 w-full rounded-2xl bg-white border border-[#2B3024]/10 px-5 py-4 text-[#2B3024] focus:ring-2 focus:ring-[#2B3024]/20 focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-sm text-[#a03636]" data-testid="check-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !a || !b}
            data-testid="check-submit-btn"
            className="w-full rounded-full bg-[#2B3024] text-[#F9F8F5] py-4 text-sm tracking-wide font-medium hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(43,48,36,0.18)] disabled:opacity-40"
          >
            {loading ? "Checking..." : "Check compatibility"}
          </button>
        </form>

        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key={`${result.canonical_a}-${result.canonical_b}-${result.status}`}
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`mt-10 rounded-3xl border-2 p-7 ${style.ring}`}
              style={{ backgroundColor: style.accent }}
              data-testid="check-result"
            >
              <div className="flex items-start gap-4">
                <StatusIcon
                  className="w-8 h-8 flex-shrink-0 mt-0.5"
                  strokeWidth={1.6}
                  style={{ color: style.text }}
                />
                <div className="min-w-0">
                  <p
                    className="text-[10px] tracking-[0.28em] uppercase font-bold"
                    style={{ color: style.text, opacity: 0.7 }}
                    data-testid="check-result-status"
                  >
                    {result.status}
                  </p>
                  <p
                    className="mt-1 font-serif italic text-2xl leading-tight"
                    style={{ color: style.text }}
                    data-testid="check-result-verdict"
                  >
                    {result.verdict}
                  </p>
                  {result.canonical_a && result.canonical_b && (
                    <p
                      className="mt-3 text-xs tracking-[0.16em] uppercase font-bold"
                      style={{ color: style.text, opacity: 0.65 }}
                      data-testid="check-result-pair"
                    >
                      {result.canonical_a} + {result.canonical_b}
                    </p>
                  )}
                  <p
                    className="mt-3 leading-relaxed"
                    style={{ color: style.text, opacity: 0.85 }}
                    data-testid="check-result-reason"
                  >
                    {result.reason}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-12">
          <p className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/50">
            Try a few
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ["Retinol", "Vitamin C"],
              ["AHA", "BHA"],
              ["Niacinamide", "Hyaluronic Acid"],
              ["Retinol", "Benzoyl Peroxide"],
            ].map(([x, y]) => (
              <button
                key={`${x}-${y}`}
                onClick={() => {
                  setA(x);
                  setB(y);
                }}
                data-testid={`check-preset-${x}-${y}`.toLowerCase().replace(/\s+/g, "-")}
                className="rounded-full bg-white border border-[#2B3024]/15 px-4 py-2 text-xs tracking-[0.14em] uppercase text-[#2B3024]/70 hover:border-[#2B3024]/40 hover:text-[#2B3024]"
              >
                {x} + {y}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
