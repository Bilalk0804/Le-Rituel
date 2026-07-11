import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LogOut } from "lucide-react";

export function TopBar({ showLogout = true }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const handleLogout = async () => {
    await logout();
    nav("/");
  };

  return (
    <header className="w-full px-6 sm:px-10 py-6 flex items-center justify-between">
      <Link to={user ? "/dashboard" : "/"} className="group" data-testid="topbar-brand">
        <span className="font-serif italic text-2xl tracking-tight text-[#2B3024]">
          Le Rituel
        </span>
      </Link>
      {showLogout && user && (
        <button
          onClick={handleLogout}
          data-testid="topbar-logout-btn"
          className="text-xs tracking-[0.2em] uppercase text-[#2B3024]/60 hover:text-[#2B3024] inline-flex items-center gap-2"
        >
          <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
          Sign out
        </button>
      )}
    </header>
  );
}
