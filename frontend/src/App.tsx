import { useEffect, useState } from "react";
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
  const [pending, setPending] = useState(!restored);

  useEffect(() => {
    if (pending) {
      void tryRestoreSession().finally(() => setPending(false));
    }
  }, [pending]);

  if (pending) return null;
  if (restored && csrfToken) return children;
  return <Navigate to="/login" replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-night-600 via-night-800 to-night-900 text-milk">
        <ParticleBackground />

        {/* 装饰月亮：暖土黄满月，中心亮边缘暗 */}
        <div
          className="pointer-events-none fixed -right-16 -top-16 z-0 h-56 w-56 rounded-full sm:h-72 sm:w-72"
          style={{
            background:
              "radial-gradient(circle at 42% 40%, rgba(246, 211, 101, 0.5), rgba(201, 151, 79, 0.22) 55%, rgba(181, 129, 66, 0.08) 78%, transparent 100%)",
            filter: "blur(6px)",
          }}
        />
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
