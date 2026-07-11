import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(email.trim(), password, name.trim() || null);
      toast.success("Account created — let's build your ritual");
      nav("/quiz");
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
        <h1 className="font-serif italic text-4xl text-[#2B3024]" data-testid="register-heading">
          Begin your ritual
        </h1>
        <p className="mt-3 text-[#2B3024]/70">Create an account so we can save your routine.</p>

        <form onSubmit={submit} className="mt-10 space-y-5">
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/60">Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="register-name-input"
              className="mt-2 w-full rounded-2xl bg-white border border-[#2B3024]/10 px-5 py-4 text-[#2B3024] focus:ring-2 focus:ring-[#2B3024]/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/60">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="register-email-input"
              className="mt-2 w-full rounded-2xl bg-white border border-[#2B3024]/10 px-5 py-4 text-[#2B3024] focus:ring-2 focus:ring-[#2B3024]/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/60">Password</label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="register-password-input"
              className="mt-2 w-full rounded-2xl bg-white border border-[#2B3024]/10 px-5 py-4 text-[#2B3024] focus:ring-2 focus:ring-[#2B3024]/20 focus:outline-none"
            />
            <p className="mt-2 text-xs text-[#2B3024]/50">At least 8 characters.</p>
          </div>

          {error && (
            <p className="text-sm text-[#a03636]" data-testid="register-error">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            data-testid="register-submit-btn"
            className="w-full rounded-full bg-[#2B3024] text-[#F9F8F5] py-4 text-sm tracking-wide font-medium hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(43,48,36,0.18)] disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <p className="mt-8 text-sm text-[#2B3024]/60 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-[#2B3024] underline underline-offset-4" data-testid="register-to-login-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
