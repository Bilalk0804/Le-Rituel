import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Sparkles, ArrowRight, X, Loader2 } from "lucide-react";
import { api, formatApiErrorDetail } from "@/lib/api";

/**
 * Optional photo-based skin analysis step. Uploads a face photo to Claude 4.5
 * vision via /api/skin/analyze and calls `onDone({ skin_type, concerns })` on
 * accept. Calls `onSkip()` when the user chooses to answer manually. The photo
 * is never stored server-side.
 */
export function SkinPhotoStep({ onDone, onSkip }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [dataUrl, setDataUrl] = useState(null);
  const [mime, setMime] = useState("image/jpeg");
  const [status, setStatus] = useState("idle"); // idle | analyzing | ready | error
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);

  const openPicker = () => inputRef.current?.click();

  const readFile = (file) =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });

  const handleFile = async (file) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please pick a JPEG, PNG or WebP image.");
      setStatus("error");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setError("Image is too large — try one under 6 MB.");
      setStatus("error");
      return;
    }
    setError("");
    const url = await readFile(file);
    setDataUrl(url);
    setPreview(url);
    setMime(file.type);
    setAnalysis(null);
    setStatus("idle");
  };

  const onFileChange = (e) => handleFile(e.target.files?.[0]);

  const runAnalysis = async () => {
    if (!dataUrl) return;
    setStatus("analyzing");
    setError("");
    try {
      const { data } = await api.post("/skin/analyze", {
        image_base64: dataUrl,
        mime_type: mime,
      });
      setAnalysis(data.analysis);
      setStatus("ready");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
      setStatus("error");
    }
  };

  const accept = () => {
    if (analysis) onDone(analysis);
  };

  const clear = () => {
    setPreview(null);
    setDataUrl(null);
    setAnalysis(null);
    setStatus("idle");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      data-testid="skin-photo-step"
    >
      <div className="inline-flex items-center gap-2 rounded-full bg-[#F3E8E0] px-3 py-1.5">
        <Sparkles className="w-3.5 h-3.5 text-[#2B3024]" strokeWidth={1.6} />
        <span className="text-[10px] tracking-[0.24em] uppercase font-bold text-[#2B3024]">Optional · AI</span>
      </div>

      <h2 className="mt-5 font-serif italic text-3xl sm:text-4xl leading-tight text-[#2B3024]">
        Want us to look at your skin?
      </h2>
      <p className="mt-3 text-[#2B3024]/70">
        Upload a natural-light selfie and we&apos;ll pre-fill the quiz for you. Your photo is analyzed
        and immediately discarded — never stored.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onFileChange}
        className="hidden"
        data-testid="skin-photo-file-input"
      />

      {!preview ? (
        <button
          onClick={openPicker}
          data-testid="skin-photo-pick-btn"
          className="mt-8 w-full rounded-3xl border-2 border-dashed border-[#2B3024]/25 bg-white/60 hover:border-[#2B3024]/60 hover:bg-white py-10 flex flex-col items-center gap-3 text-[#2B3024]"
        >
          <Camera className="w-8 h-8" strokeWidth={1.4} />
          <span className="font-medium">Choose a photo</span>
          <span className="text-xs text-[#2B3024]/60">JPEG, PNG or WebP · under 6 MB</span>
        </button>
      ) : (
        <div className="mt-8 relative rounded-3xl overflow-hidden bg-white shadow-[0_8px_32px_rgba(43,48,36,0.06)]">
          <img
            src={preview}
            alt="Selfie preview"
            className="w-full h-64 object-cover"
            data-testid="skin-photo-preview"
          />
          <button
            onClick={clear}
            data-testid="skin-photo-clear-btn"
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-[#2B3024] text-[#F9F8F5] grid place-items-center hover:opacity-90"
            aria-label="Remove photo"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      )}

      {status === "error" && error && (
        <p className="mt-4 text-sm text-[#a03636]" data-testid="skin-photo-error">
          {error}
        </p>
      )}

      {status === "ready" && analysis && (
        <div className="mt-6 rounded-3xl bg-[#D2D9C5] p-6" data-testid="skin-photo-analysis">
          <p className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/70">Our read</p>
          <p className="mt-3 text-[#2B3024]">
            <span className="font-medium">Skin type:</span>{" "}
            <span data-testid="skin-photo-result-type">{analysis.skin_type}</span>
          </p>
          {analysis.concerns?.length > 0 && (
            <p className="mt-1.5 text-[#2B3024]">
              <span className="font-medium">Concerns:</span>{" "}
              <span data-testid="skin-photo-result-concerns">{analysis.concerns.join(", ")}</span>
            </p>
          )}
          {analysis.notes && (
            <p className="mt-3 text-sm text-[#2B3024]/80 italic">{analysis.notes}</p>
          )}
          <p className="mt-4 text-xs text-[#2B3024]/60">
            You can adjust anything in the next steps.
          </p>
        </div>
      )}

      <div className="mt-8 space-y-3">
        {preview && status !== "ready" && (
          <button
            onClick={runAnalysis}
            disabled={status === "analyzing"}
            data-testid="skin-photo-analyze-btn"
            className="w-full rounded-full bg-[#2B3024] text-[#F9F8F5] py-4 text-sm tracking-wide font-medium hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(43,48,36,0.18)] disabled:opacity-60 inline-flex items-center justify-center gap-3"
          >
            {status === "analyzing" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.8} />
                Analyzing your skin...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" strokeWidth={1.8} />
                Analyze my photo
              </>
            )}
          </button>
        )}

        {status === "ready" && (
          <button
            onClick={accept}
            data-testid="skin-photo-accept-btn"
            className="w-full rounded-full bg-[#2B3024] text-[#F9F8F5] py-4 text-sm tracking-wide font-medium hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(43,48,36,0.18)] inline-flex items-center justify-center gap-3"
          >
            Use these answers <ArrowRight className="w-4 h-4" strokeWidth={1.8} />
          </button>
        )}

        <button
          onClick={onSkip}
          data-testid="skin-photo-skip-btn"
          className="w-full text-sm text-[#2B3024]/70 hover:text-[#2B3024] underline underline-offset-4 py-2"
        >
          I&apos;d rather answer the quiz manually
        </button>
      </div>
    </motion.div>
  );
}
