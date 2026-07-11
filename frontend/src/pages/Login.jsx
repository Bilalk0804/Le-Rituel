import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email.trim(), password);
      toast.success("Welcome back");
      nav("/dashboard");
    } catch (err) {
      const msg = formatApiErrorDetail(err.response?.data?.detail) || err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#F9F8F5]">
      <TopBar showLogout={false} />
      <div className="px-6 pt-4 pb-16 max-w-md mx-auto">
        <h1 className="font-serif italic text-4xl text-[#2B3024]" data-testid="login-heading">
          Welcome back
        </h1>
        <p className="mt-3 text-[#2B3024]/70">Sign in to see your saved ritual.</p>

        <form onSubmit={submit} className="mt-10 space-y-5">
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/60">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="login-email-input"
              className="mt-2 w-full rounded-2xl bg-white border border-[#2B3024]/10 px-5 py-4 text-[#2B3024] focus:ring-2 focus:ring-[#2B3024]/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/60">Password</label>
            <input
              type="password"
              required
              minLength={1}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="login-password-input"
              className="mt-2 w-full rounded-2xl bg-white border border-[#2B3024]/10 px-5 py-4 text-[#2B3024] focus:ring-2 focus:ring-[#2B3024]/20 focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-sm text-[#a03636]" data-testid="login-error">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            data-testid="login-submit-btn"
            className="w-full rounded-full bg-[#2B3024] text-[#F9F8F5] py-4 text-sm tracking-wide font-medium hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(43,48,36,0.18)] disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-8 text-sm text-[#2B3024]/60 text-center">
          New here?{" "}
          <Link to="/register" className="text-[#2B3024] underline underline-offset-4" data-testid="login-to-register-link">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
