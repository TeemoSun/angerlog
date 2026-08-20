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
      <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-[#2a2258] via-[#15122b] to-[#0b0a1a] text-slate-100">
        <ParticleBackground />

        {/* 装饰月亮 */}
        <div className="pointer-events-none fixed -right-24 -top-24 z-0 h-72 w-72 rounded-full bg-amber-100/8 blur-3xl sm:h-96 sm:w-96" />
        <div className="pointer-events-none fixed -right-12 -top-12 z-0 h-48 w-48 rounded-full bg-gradient-to-br from-amber-100/12 to-amber-300/5 blur-2xl sm:h-72 sm:w-72" />
        <div className="pointer-events-none fixed bottom-0 left-0 z-0 h-40 w-full bg-gradient-to-t from-night-900/80 to-transparent" />

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
