import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Camera, ArrowLeft, X, TrendingUp, Trash2 } from "lucide-react";

const METRICS = [
  { key: "acne", label: "Acne", color: "#B25A4D" },
  { key: "redness", label: "Redness", color: "#D08C79" },
  { key: "oiliness", label: "Oiliness", color: "#8FA07A" },
  { key: "hydration", label: "Hydration", color: "#5C7A9B" },
];

// Resize an image File to max 900px on the long side, JPEG @ 0.78.
async function resizeAndEncode(file) {
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxSide = 900;
      let { width, height } = img;
      if (Math.max(width, height) > maxSide) {
        const scale = maxSide / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function RatingSlider({ metric, value, onChange }) {
  return (
    <label className="block" data-testid={`progress-slider-${metric.key}`}>
      <div className="flex items-baseline justify-between">
        <span className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/70">
          {metric.label}
        </span>
        <span
          className="font-serif italic text-2xl leading-none"
          style={{ color: metric.color }}
          data-testid={`progress-slider-${metric.key}-value`}
        >
          {value}
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        data-testid={`progress-slider-${metric.key}-input`}
        className="mt-2 w-full appearance-none h-1.5 rounded-full bg-[#2B3024]/10 accent-[#2B3024] cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${metric.color} 0%, ${metric.color} ${((value - 1) / 4) * 100}%, rgba(43,48,36,0.10) ${((value - 1) / 4) * 100}%, rgba(43,48,36,0.10) 100%)`,
        }}
      />
      <div className="flex justify-between text-[10px] tracking-[0.18em] uppercase text-[#2B3024]/40 mt-1">
        <span>Low</span>
        <span>High</span>
      </div>
    </label>
  );
}

function TimelineCard({ entry, onDelete }) {
  const dateStr = new Date(entry.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const src = entry.image_base64.startsWith("data:")
    ? entry.image_base64
    : `data:${entry.mime_type};base64,${entry.image_base64}`;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-shrink-0 w-56 bg-white rounded-3xl overflow-hidden shadow-[0_6px_24px_rgba(43,48,36,0.06)]"
      data-testid={`progress-entry-${entry.id}`}
    >
      <div className="relative h-56 bg-[#F3E8E0]">
        <img
          src={src}
          alt={`Progress ${dateStr}`}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <button
          onClick={() => onDelete(entry.id)}
          aria-label="Delete entry"
          data-testid={`progress-entry-${entry.id}-delete`}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-[#2B3024]/85 text-[#F9F8F5] grid place-items-center hover:bg-[#2B3024]"
        >
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.6} />
        </button>
      </div>
      <div className="p-4">
        <p className="text-[10px] tracking-[0.22em] uppercase font-bold text-[#2B3024]/60">
          {dateStr}
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          {METRICS.map((m) => (
            <li key={m.key} className="flex items-center justify-between text-[#2B3024]/80">
              <span>{m.label}</span>
              <span className="font-serif italic text-base" style={{ color: m.color }}>
                {entry.ratings?.[m.key] ?? "—"}
              </span>
            </li>
          ))}
        </ul>
        {entry.notes && (
          <p className="mt-3 text-xs text-[#2B3024]/70 italic leading-relaxed">
            &ldquo;{entry.notes}&rdquo;
          </p>
        )}
      </div>
    </motion.article>
  );
}

export default function Progress() {
  const fileRef = useRef(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [encoded, setEncoded] = useState(null);
  const [ratings, setRatings] = useState({ acne: 3, redness: 3, oiliness: 3, hydration: 3 });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get("/progress/entries");
      setEntries(data.entries || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openPicker = () => fileRef.current?.click();

  const handleFile = async (file) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please pick a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Image is too large — try one under 8 MB.");
      return;
    }
    setError("");
    const data = await resizeAndEncode(file);
    setPreview(data);
    setEncoded(data);
  };

  const clearForm = () => {
    setPreview(null);
    setEncoded(null);
    setRatings({ acne: 3, redness: 3, oiliness: 3, hydration: 3 });
    setNotes("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const save = async () => {
    if (!encoded) {
      setError("Please add a photo first.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.post("/progress/entries", {
        image_base64: encoded,
        mime_type: "image/jpeg",
        ratings,
        notes: notes || null,
      });
      toast.success("Entry saved");
      clearForm();
      load();
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id) => {
    if (!window.confirm("Delete this entry? This cannot be undone.")) return;
    await api.delete(`/progress/entries/${id}`);
    toast.success("Entry deleted");
    load();
  };

  // Chart data: oldest → newest so the line reads left-to-right chronologically.
  const chartData = [...entries].reverse().map((e) => ({
    date: new Date(e.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    acne: e.ratings?.acne ?? null,
    redness: e.ratings?.redness ?? null,
    oiliness: e.ratings?.oiliness ?? null,
    hydration: e.ratings?.hydration ?? null,
  }));

  return (
    <div className="min-h-[100dvh] bg-[#F9F8F5]" data-testid="progress-page">
      <TopBar />

      <div className="px-6 pt-4 pb-24 max-w-4xl mx-auto">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-[#2B3024]/60 hover:text-[#2B3024]"
          data-testid="progress-back-link"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.6} />
          Back to dashboard
        </Link>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#F3E8E0] px-3 py-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#2B3024]" strokeWidth={1.6} />
            <span className="text-[10px] tracking-[0.24em] uppercase font-bold text-[#2B3024]">
              Progress log
            </span>
          </div>
          <h1
            className="mt-5 font-serif italic text-4xl sm:text-5xl leading-tight text-[#2B3024]"
            data-testid="progress-heading"
          >
            Track your skin over time.
          </h1>
          <p className="mt-3 text-[#2B3024]/70 max-w-lg">
            Log a photo and how your skin feels today. Come back weekly — the timeline and chart
            will build themselves.
          </p>
        </motion.div>

        {/* New entry form */}
        <section className="mt-10 bg-white rounded-3xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(43,48,36,0.06)]">
          <p className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/60">
            New entry
          </p>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="hidden"
            data-testid="progress-file-input"
          />

          <div className="mt-5 grid md:grid-cols-2 gap-6">
            <div>
              {!preview ? (
                <button
                  onClick={openPicker}
                  data-testid="progress-pick-btn"
                  className="w-full aspect-square rounded-3xl border-2 border-dashed border-[#2B3024]/25 bg-[#F9F8F5]/60 hover:border-[#2B3024]/60 hover:bg-white flex flex-col items-center justify-center gap-3 text-[#2B3024]"
                >
                  <Camera className="w-7 h-7" strokeWidth={1.4} />
                  <span className="font-medium text-sm">Take or upload today&apos;s selfie</span>
                  <span className="text-xs text-[#2B3024]/55">JPEG, PNG or WebP</span>
                </button>
              ) : (
                <div className="relative rounded-3xl overflow-hidden bg-white shadow-[0_4px_16px_rgba(43,48,36,0.05)] aspect-square">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    data-testid="progress-preview"
                  />
                  <button
                    onClick={clearForm}
                    aria-label="Remove"
                    data-testid="progress-clear-btn"
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-[#2B3024] text-[#F9F8F5] grid place-items-center hover:opacity-90"
                  >
                    <X className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-5">
              {METRICS.map((m) => (
                <RatingSlider
                  key={m.key}
                  metric={m}
                  value={ratings[m.key]}
                  onChange={(v) => setRatings((prev) => ({ ...prev, [m.key]: v }))}
                />
              ))}
            </div>
          </div>

          <div className="mt-6">
            <label className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/60">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={280}
              rows={2}
              placeholder="Anything new today — new product, stress, cycle..."
              data-testid="progress-notes-input"
              className="mt-2 w-full rounded-2xl bg-[#F9F8F5] border border-[#2B3024]/10 px-5 py-3 text-[#2B3024] focus:ring-2 focus:ring-[#2B3024]/20 focus:outline-none resize-none"
            />
          </div>

          {error && (
            <p className="mt-4 text-sm text-[#a03636]" data-testid="progress-error">
              {error}
            </p>
          )}

          <button
            onClick={save}
            disabled={saving || !encoded}
            data-testid="progress-save-btn"
            className="mt-6 rounded-full bg-[#2B3024] text-[#F9F8F5] px-8 py-4 text-sm tracking-wide font-medium hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(43,48,36,0.18)] disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save entry"}
          </button>
        </section>

        {/* Chart */}
        {chartData.length >= 2 && (
          <section className="mt-10 bg-white rounded-3xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(43,48,36,0.06)]" data-testid="progress-chart">
            <p className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/60">
              Trend
            </p>
            <p className="mt-2 font-serif italic text-xl text-[#2B3024]">
              Your ratings over {chartData.length} entries
            </p>
            <div className="mt-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="#2B3024" strokeOpacity={0.08} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#2B3024", fillOpacity: 0.55, fontSize: 11 }}
                    axisLine={{ stroke: "#2B3024", strokeOpacity: 0.15 }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    tick={{ fill: "#2B3024", fillOpacity: 0.55, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#2B3024",
                      border: "none",
                      borderRadius: 16,
                      color: "#F9F8F5",
                      fontSize: 12,
                    }}
                    itemStyle={{ color: "#F9F8F5" }}
                    labelStyle={{ color: "#F9F8F5", opacity: 0.7 }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11, paddingTop: 8, color: "#2B3024" }}
                  />
                  {METRICS.map((m) => (
                    <Line
                      key={m.key}
                      type="monotone"
                      dataKey={m.key}
                      name={m.label}
                      stroke={m.color}
                      strokeWidth={2}
                      dot={{ r: 3, fill: m.color, stroke: m.color }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Timeline */}
        <section className="mt-10" data-testid="progress-timeline">
          <div className="flex items-center gap-3">
            <p className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/60">
              Timeline
            </p>
            <span className="text-[10px] tracking-[0.18em] uppercase text-[#2B3024]/40">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-[#2B3024]/60">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="mt-6 text-sm text-[#2B3024]/60" data-testid="progress-empty">
              No entries yet — save your first one above.
            </p>
          ) : (
            <div className="mt-5 flex gap-4 overflow-x-auto pb-3 -mx-6 px-6 snap-x snap-mandatory">
              {entries.map((e) => (
                <div key={e.id} className="snap-start">
                  <TimelineCard entry={e} onDelete={deleteEntry} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
