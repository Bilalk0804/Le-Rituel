import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (user === null) {
    return (
      <div className="min-h-[100dvh] grid place-items-center text-[#2B3024]/60">
        <span className="text-xs tracking-[0.2em] uppercase">Loading</span>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
