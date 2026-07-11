import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { TopBar } from "@/components/TopBar";

const IMG = "https://images.unsplash.com/photo-1585652757141-8837d676fac8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAxODF8MHwxfHNlYXJjaHw0fHxtaW5pbWFsaXN0JTIwc2tpbmNhcmUlMjBzZXJ1bSUyMGRyb3B8ZW58MHx8fHwxNzgzNzUzMjA0fDA&ixlib=rb-4.1.0&q=85";

export default function Landing() {
  return (
    <div className="min-h-[100dvh] bg-[#F9F8F5]" data-testid="landing-page">
      <TopBar showLogout={false} />

      <section className="px-6 sm:px-10 pt-6 pb-24 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-xl"
          >
            <span className="text-xs tracking-[0.28em] uppercase font-bold text-[#7A8271]" data-testid="landing-eyebrow">
              A calmer skincare start
            </span>
            <h1 className="mt-6 font-serif italic text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight text-[#2B3024]" data-testid="landing-heading">
              Your skincare,<br />finally uncomplicated.
            </h1>
            <p className="mt-8 text-base sm:text-lg leading-relaxed text-[#2B3024]/70">
              Answer six honest questions. We build the morning and evening routine your skin actually needs. No aisle-scrolling. No guessing.
            </p>

            <div className="mt-10 flex items-center gap-4 flex-wrap">
              <Link
                to="/register"
                data-testid="landing-start-quiz-btn"
                className="group inline-flex items-center gap-3 rounded-full bg-[#2B3024] px-8 py-4 text-[#F9F8F5] text-sm tracking-wide font-medium hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(43,48,36,0.18)]"
              >
                Start my ritual
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1" strokeWidth={1.8} />
              </Link>
              <Link
                to="/login"
                data-testid="landing-login-link"
                className="text-sm tracking-wide text-[#2B3024]/70 hover:text-[#2B3024] underline underline-offset-4"
              >
                I already have an account
              </Link>
            </div>

            <div className="mt-14 flex items-center gap-6 text-xs tracking-[0.18em] uppercase text-[#2B3024]/50">
              <span>~ 2 min</span>
              <span className="w-6 h-px bg-[#2B3024]/20" />
              <span>6 questions</span>
              <span className="w-6 h-px bg-[#2B3024]/20" />
              <span>AM · PM routine</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.15 }}
            className="relative"
          >
            <div className="aspect-[4/5] rounded-[36px] overflow-hidden shadow-[0_20px_60px_rgba(43,48,36,0.10)]">
              <img
                src={IMG}
                alt="Skincare bottles on soft fabric"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 hidden md:block bg-[#D2D9C5] rounded-3xl px-6 py-5 max-w-[220px] shadow-[0_8px_32px_rgba(43,48,36,0.08)]">
              <p className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/70">Step 03</p>
              <p className="mt-2 font-serif italic text-lg text-[#2B3024]">Moisturizer, matched to your barrier.</p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
