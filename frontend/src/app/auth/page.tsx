"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/lib/api";

function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  const redirect = params.get("redirect") || "/dashboard";
  const plan = params.get("plan");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        await api.login(email, password);
      } else {
        await api.register(email, password);
        await api.login(email, password);
      }
      const url = plan ? `${redirect}?plan=${plan}` : redirect;
      router.push(url);
    } catch (err: any) {
      setError(err.message || "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-grid">
      {/* Minimal nav */}
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2.5 group w-fit">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-blue flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#040810" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="font-display font-bold text-lg text-white">
            Void<span className="text-neon-cyan">VPN</span>
          </span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <div className="glass-card p-8 md:p-10">
            <h1 className="font-display font-bold text-2xl text-white text-center mb-2">
              {isLogin ? "Вход в аккаунт" : "Создать аккаунт"}
            </h1>
            <p className="text-sm text-slate-500 text-center mb-8">
              {isLogin
                ? "Войдите, чтобы управлять подпиской"
                : "Зарегистрируйтесь для начала работы"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-dark"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                  Пароль
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="input-dark"
                />
              </div>

              {error && (
                <div className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-solid w-full !py-3 disabled:opacity-50"
              >
                {loading
                  ? "Загрузка..."
                  : isLogin
                  ? "Войти"
                  : "Зарегистрироваться"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <span className="text-sm text-slate-500">
                {isLogin ? "Нет аккаунта? " : "Уже есть аккаунт? "}
              </span>
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                className="text-sm text-neon-cyan hover:text-neon-cyan/80 transition-colors font-medium"
              >
                {isLogin ? "Зарегистрироваться" : "Войти"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-void-950">
          <div className="text-slate-500">Загрузка...</div>
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
