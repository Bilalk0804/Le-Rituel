import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { toast } from "sonner";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!token) {
      setError("Missing reset token. Request a new link.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Password updated — sign in with your new password");
      nav("/login");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#F9F8F5]" data-testid="reset-password-page">
      <TopBar showLogout={false} />
      <div className="px-6 pt-4 pb-16 max-w-md mx-auto">
        <h1 className="mt-6 font-serif italic text-4xl text-[#2B3024]" data-testid="reset-heading">
          Choose a new password
        </h1>
        <p className="mt-3 text-[#2B3024]/70">
          Make it at least eight characters. Something you'll remember.
        </p>

        <form onSubmit={submit} className="mt-10 space-y-5">
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/60">
              New password
            </label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="reset-password-input"
              className="mt-2 w-full rounded-2xl bg-white border border-[#2B3024]/10 px-5 py-4 text-[#2B3024] focus:ring-2 focus:ring-[#2B3024]/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/60">
              Confirm password
            </label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              data-testid="reset-confirm-input"
              className="mt-2 w-full rounded-2xl bg-white border border-[#2B3024]/10 px-5 py-4 text-[#2B3024] focus:ring-2 focus:ring-[#2B3024]/20 focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-sm text-[#a03636]" data-testid="reset-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            data-testid="reset-submit-btn"
            className="w-full rounded-full bg-[#2B3024] text-[#F9F8F5] py-4 text-sm tracking-wide font-medium hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(43,48,36,0.18)] disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>

        <p className="mt-8 text-sm text-[#2B3024]/60 text-center">
          Need a new link?{" "}
          <Link
            to="/forgot-password"
            className="text-[#2B3024] underline underline-offset-4"
            data-testid="reset-request-new-link"
          >
            Request another
          </Link>
        </p>
      </div>
    </div>
  );
}
