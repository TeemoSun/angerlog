import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
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
      setCsrfToken(result.csrf_token);
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
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <Card>
          <CardHeader className="items-center text-center">
            <div className="mb-2 text-5xl">🫙</div>
            <CardTitle className="text-xl">情绪瓶</CardTitle>
            <CardDescription>把生气装进瓶子，让情绪有处安放</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="flex flex-col gap-4" data-testid="login-form">
              <div className="flex flex-col gap-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="请输入用户名"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="请输入密码"
                />
              </div>
              {error && (
                <p className="text-xs text-red-400" role="alert" data-testid="login-error">
                  {error}
                </p>
              )}
              <Button type="submit" size="lg" disabled={submitting} className="mt-2">
                {submitting ? "登录中…" : "登录"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
