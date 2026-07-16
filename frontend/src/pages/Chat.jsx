import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Sparkles, MessageCircle } from "lucide-react";
import { toast } from "sonner";

const STARTER_PROMPTS = [
  "Can I use vitamin C with my current retinol?",
  "How do I introduce a new serum without irritation?",
  "What order should I apply my routine?",
  "Is my routine ok for sensitive skin?",
];

function Bubble({ role, content, pending }) {
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-3xl px-5 py-3 ${
          isUser
            ? "bg-[#2B3024] text-[#F9F8F5] rounded-br-lg"
            : "bg-white text-[#2B3024] rounded-bl-lg shadow-[0_4px_20px_rgba(43,48,36,0.05)]"
        }`}
      >
        {pending ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2B3024]/40 animate-pulse" />
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#2B3024]/40 animate-pulse"
              style={{ animationDelay: "0.15s" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#2B3024]/40 animate-pulse"
              style={{ animationDelay: "0.3s" }}
            />
          </span>
        ) : (
          <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{content}</p>
        )}
      </div>
    </motion.div>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text) => {
    const msg = (text ?? draft).trim();
    if (!msg || sending) return;
    setDraft("");
    const nextHistory = [...messages, { role: "user", content: msg }];
    setMessages(nextHistory);
    setSending(true);
    try {
      const { data } = await api.post("/chat", {
        message: msg,
        history: messages, // history BEFORE this turn (Pydantic expects previous turns)
      });
      setMessages([...nextHistory, { role: "assistant", content: data.reply }]);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Assistant unavailable");
      // Roll back the user message so they can try again.
      setMessages(messages);
      setDraft(msg);
    } finally {
      setSending(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#F9F8F5] flex flex-col" data-testid="chat-page">
      <TopBar />

      <div className="px-6 max-w-3xl w-full mx-auto flex flex-col flex-1 pt-2 pb-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-[#2B3024]/60 hover:text-[#2B3024]"
          data-testid="chat-back-link"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.6} />
          Back to dashboard
        </Link>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F3E8E0] px-3 py-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-[#2B3024]" strokeWidth={1.6} />
            <span className="text-[10px] tracking-[0.24em] uppercase font-bold text-[#2B3024]">
              Skincare assistant
            </span>
          </div>
          <h1 className="mt-4 font-serif italic text-3xl sm:text-4xl leading-tight text-[#2B3024]" data-testid="chat-heading">
            Ask anything about your skin.
          </h1>
          <p className="mt-2 text-sm text-[#2B3024]/70 max-w-lg">
            I know your quiz answers and current routine, so I&apos;ll tailor my answers to you.
            Skincare only — no other topics.
          </p>
        </motion.div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="mt-6 flex-1 overflow-y-auto space-y-3 pb-2"
          data-testid="chat-messages"
        >
          {messages.length === 0 && (
            <div className="rounded-3xl bg-white p-6 shadow-[0_4px_20px_rgba(43,48,36,0.05)]" data-testid="chat-empty">
              <div className="flex items-center gap-2 text-[#2B3024]">
                <Sparkles className="w-4 h-4" strokeWidth={1.6} />
                <p className="font-serif italic text-xl">A few things to try</p>
              </div>
              <ul className="mt-4 flex flex-wrap gap-2">
                {STARTER_PROMPTS.map((p) => (
                  <li key={p}>
                    <button
                      onClick={() => send(p)}
                      data-testid={`chat-starter-${p.slice(0, 10).replace(/\s+/g, "-").toLowerCase()}`}
                      className="rounded-full bg-[#F9F8F5] border border-[#2B3024]/15 px-4 py-2 text-xs text-[#2B3024]/80 hover:border-[#2B3024]/40 hover:text-[#2B3024] text-left"
                    >
                      {p}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} content={m.content} />
            ))}
          </AnimatePresence>

          {sending && <Bubble role="assistant" pending />}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="mt-4 flex items-end gap-2 bg-white rounded-3xl p-2 border border-[#2B3024]/10 shadow-[0_6px_24px_rgba(43,48,36,0.06)]"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            maxLength={1500}
            placeholder="Ask about your routine, ingredients, timing..."
            data-testid="chat-input"
            className="flex-1 resize-none bg-transparent px-3 py-2 text-[#2B3024] placeholder:text-[#2B3024]/40 focus:outline-none"
            style={{ minHeight: "40px", maxHeight: "140px" }}
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            data-testid="chat-send-btn"
            aria-label="Send"
            className="w-10 h-10 rounded-full bg-[#2B3024] text-[#F9F8F5] grid place-items-center flex-shrink-0 disabled:opacity-40 hover:-translate-y-0.5"
          >
            <Send className="w-4 h-4" strokeWidth={1.6} />
          </button>
        </form>
      </div>
    </div>
  );
}
