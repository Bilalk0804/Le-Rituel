import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Download, Trash2, ArrowLeft } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/profile");
        setProfile(data.profile);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const exportData = async () => {
    try {
      const { data } = await api.get("/account/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `le-rituel-${user?.email || "data"}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported");
    } catch (e) {
      toast.error("Export failed");
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await api.delete("/account");
      toast.success("Account deleted");
      // Force full navigation to landing BEFORE clearing auth state so
      // ProtectedRoute doesn't race us to /login.
      window.location.replace("/");
    } catch (e) {
      toast.error("Delete failed");
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#F9F8F5]" data-testid="settings-page">
      <TopBar />

      <div className="px-6 pt-4 pb-20 max-w-2xl mx-auto">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-[#2B3024]/60 hover:text-[#2B3024]"
          data-testid="settings-back-link"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.6} />
          Back to dashboard
        </Link>

        <h1 className="mt-6 font-serif italic text-4xl text-[#2B3024]" data-testid="settings-heading">
          Your profile
        </h1>

        <section className="mt-10 bg-white rounded-3xl p-7 shadow-[0_8px_32px_rgba(43,48,36,0.06)]">
          <p className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/60">Account</p>
          <p className="mt-3 font-medium text-[#2B3024]">{user?.email}</p>
          {user?.name && <p className="text-[#2B3024]/70">{user.name}</p>}
        </section>

        <section className="mt-6 bg-white rounded-3xl p-7 shadow-[0_8px_32px_rgba(43,48,36,0.06)]">
          <p className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/60">Skin profile</p>
          {profile ? (
            <dl className="mt-4 grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
              <dt className="text-[#2B3024]/60">Skin type</dt>
              <dd className="text-[#2B3024]">{profile.skin_type}</dd>
              <dt className="text-[#2B3024]/60">Concerns</dt>
              <dd className="text-[#2B3024]">{(profile.concerns || []).join(", ") || "—"}</dd>
              <dt className="text-[#2B3024]/60">Allergies</dt>
              <dd className="text-[#2B3024]">{profile.allergies || "—"}</dd>
              <dt className="text-[#2B3024]/60">Age</dt>
              <dd className="text-[#2B3024]">{profile.age_range}</dd>
              <dt className="text-[#2B3024]/60">Budget</dt>
              <dd className="text-[#2B3024]">{profile.budget}</dd>
              <dt className="text-[#2B3024]/60">Current routine</dt>
              <dd className="text-[#2B3024]">{profile.current_routine_level}</dd>
            </dl>
          ) : (
            <p className="mt-3 text-[#2B3024]/60">No profile yet.</p>
          )}
          <div className="mt-6">
            <Link
              to="/quiz"
              data-testid="settings-edit-profile-btn"
              className="rounded-full bg-[#2B3024] text-[#F9F8F5] px-6 py-3 text-sm font-medium hover:-translate-y-0.5 inline-flex"
            >
              Edit skin profile
            </Link>
          </div>
        </section>

        <section className="mt-6 bg-white rounded-3xl p-7 shadow-[0_8px_32px_rgba(43,48,36,0.06)]">
          <p className="text-xs tracking-[0.2em] uppercase font-bold text-[#2B3024]/60">Data & privacy</p>
          <div className="mt-5 space-y-3">
            <button
              onClick={exportData}
              data-testid="settings-export-btn"
              className="w-full rounded-2xl border border-[#2B3024]/20 px-5 py-4 flex items-center justify-between hover:border-[#2B3024]/50 text-[#2B3024]"
            >
              <span className="font-medium">Export my data</span>
              <Download className="w-4 h-4" strokeWidth={1.6} />
            </button>

            {!confirming ? (
              <button
                onClick={() => setConfirming(true)}
                data-testid="settings-delete-init-btn"
                className="w-full rounded-2xl border border-[#a03636]/30 text-[#a03636] px-5 py-4 flex items-center justify-between hover:border-[#a03636]/60"
              >
                <span className="font-medium">Delete my account</span>
                <Trash2 className="w-4 h-4" strokeWidth={1.6} />
              </button>
            ) : (
              <div className="rounded-2xl bg-[#F3E8E0] p-5" data-testid="settings-delete-confirm">
                <p className="text-[#2B3024] font-medium">Delete permanently?</p>
                <p className="mt-1 text-sm text-[#2B3024]/70">
                  All your data — profile, routines, account — will be removed. This cannot be undone.
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={deleteAccount}
                    disabled={deleting}
                    data-testid="settings-delete-confirm-btn"
                    className="flex-1 rounded-full bg-[#a03636] text-white py-3 text-sm font-medium hover:opacity-90 disabled:opacity-60"
                  >
                    {deleting ? "Deleting..." : "Yes, delete"}
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    data-testid="settings-delete-cancel-btn"
                    className="flex-1 rounded-full border border-[#2B3024]/20 py-3 text-sm text-[#2B3024]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
