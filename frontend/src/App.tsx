import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";

import { ParticleBackground } from "@/components/ParticleBackground";
import { tryRestoreSession } from "@/lib/api";
import { AUTH_EXPIRED_EVENT, useAuthStore } from "@/stores/auth";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";

function SessionExpiredListener() {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = () => {
      navigate("/login", { replace: true });
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handler);
  }, [navigate]);
  return null;
}

function RequireAuth({ children }: { children: React.ReactElement }) {
  const csrfToken = useAuthStore((s) => s.csrfToken);
  const restored = useAuthStore((s) => s.restored);
  if (!restored) return null;
  if (!csrfToken) return <Navigate to="/login" replace />;
  return children;
}

export function App() {
  useEffect(() => {
    void tryRestoreSession();
  }, []);
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#1a1440] to-amber-950 text-slate-100">
        <ParticleBackground />
        <SessionExpiredListener />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <HomePage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
