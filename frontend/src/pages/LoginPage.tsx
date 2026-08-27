import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ERROR_ACCESS_EXPIRED, errorMessage, isApiError } from "@/lib/api";
import { loginRequest } from "@/lib/requests";
import { useAuthStore } from "@/stores/auth";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const setCsrfToken = useAuthStore((s) => s.setCsrfToken);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("请输入用户名和密码");
      return;
    }
    setSubmitting(true);
    try {
      const result = await loginRequest(username.trim(), password);
      setCsrfToken(result.csrf_token, result.timezone);
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        isApiError(err) && err.code === ERROR_ACCESS_EXPIRED
          ? "用户名或密码错误"
          : errorMessage(err),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <Card className="overflow-hidden border border-paper-muted/50 bg-paper text-ink shadow-2xl shadow-black/30">
          <div className="h-2 bg-gradient-to-r from-star-gold via-star-amber to-star-orange" />
          <CardHeader className="items-center pt-8 text-center">
            <motion.div
              className="mb-3 drop-shadow-md"
              animate={{ y: [0, -6, 0], rotate: [0, 3, -3, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Logo size={56} />
            </motion.div>
            <CardTitle className="text-4xl font-normal tracking-wide text-ink">
              情绪瓶
            </CardTitle>
            <CardDescription className="mt-2 text-ink-light">
              把生气折成星星，装进瓶子
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="flex flex-col gap-5" data-testid="login-form">
              <div className="flex flex-col gap-2">
                <Label htmlFor="username" className="text-sm font-medium text-ink">用户名</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="请输入用户名"
                  className="rounded-xl border-paper-muted/70 bg-white/60 text-ink placeholder:text-ink-light/60 focus-visible:ring-star-amber/70"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-sm font-medium text-ink">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="请输入密码"
                  className="rounded-xl border-paper-muted/70 bg-white/60 text-ink placeholder:text-ink-light/60 focus-visible:ring-star-amber/70"
                />
              </div>
              {error && (
                <p className="text-xs text-star-crimson" role="alert" data-testid="login-error">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="mt-1 w-full rounded-full bg-camel text-white shadow-lg shadow-amber-900/20 transition hover:scale-[1.02] hover:bg-camel-hover hover:shadow-xl hover:shadow-amber-900/30 disabled:opacity-60"
              >
                {submitting ? "登录中…" : "开启瓶子"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
