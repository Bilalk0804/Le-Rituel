import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster } from "sonner";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Quiz from "@/pages/Quiz";
import Result from "@/pages/Result";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";

function LandingOrDashboard() {
  const { user } = useAuth();
  if (user === null) {
    return (
      <div className="min-h-[100dvh] grid place-items-center bg-[#F9F8F5]">
        <span className="text-xs tracking-[0.2em] uppercase text-[#2B3024]/60">Loading</span>
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#2B3024",
              color: "#F9F8F5",
              border: "none",
              borderRadius: "9999px",
              padding: "12px 20px",
              fontFamily: "Manrope, sans-serif",
              fontSize: "14px",
            },
          }}
        />
        <Routes>
          <Route path="/" element={<LandingOrDashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/quiz" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
          <Route path="/result" element={<ProtectedRoute><Result /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
