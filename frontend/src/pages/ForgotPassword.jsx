import { useState } from "react";
import { Link } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#F9F8F5]" data-testid="forgot-password-page">
      <TopBar showLogout={false} />
      <div className="px-6 pt-4 pb-16 max-w-md mx-auto">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-[#2B3024]/60 hover:text-[#2B3024]"
          data-testid="forgot-back-link"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.6} />
          Back to sign in
        </Link>

        <h1 className="mt-6 font-serif italic text-4xl text-[#2B3024]" data-testid="forgot-heading">
          Reset your password
        </h1>
        <p className="mt-3 text-[#2B3024]/70">
          Enter your email — we'll send you a link to choose a new one.
        </p>

        {sent ? (
          <div
            className="mt-10 rounded-3xl bg-[#D2D9C5] p-7"
            data-testid="forgot-success-panel"
          >
            <p className="font-serif italic text-2xl text-[#2B3024]">Check your inbox.</p>
            <p className="mt-2 text-[#2B3024]/75 leading-relaxed">
              If an account exists for <span className="font-medium">{email}</span>, a reset link is
              on its way. The link expires in one hour.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex rounded-full bg-[#2B3024] text-[#F9F8F5] px-6 py-3 text-sm font-medium hover:-translate-y-0.5"
              data-testid="forgot-return-login-btn"
            >
              Return to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-10 space-y-5">
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/60">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="forgot-email-input"
                className="mt-2 w-full rounded-2xl bg-white border border-[#2B3024]/10 px-5 py-4 text-[#2B3024] focus:ring-2 focus:ring-[#2B3024]/20 focus:outline-none"
              />
            </div>

            {error && (
              <p className="text-sm text-[#a03636]" data-testid="forgot-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              data-testid="forgot-submit-btn"
              className="w-full rounded-full bg-[#2B3024] text-[#F9F8F5] py-4 text-sm tracking-wide font-medium hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(43,48,36,0.18)] disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
