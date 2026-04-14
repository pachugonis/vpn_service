"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import Logo from "@/components/Logo";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.login(email, password);
      const me = await api.me();
      if (!me.is_admin) {
        api.logout();
        throw new Error("Доступ запрещён");
      }
      router.push("/admin");
    } catch (err: any) {
      setError(err.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-grid">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2.5 group w-fit">
          <Logo
            size={34}
            className="drop-shadow-[0_0_10px_rgba(34,211,238,0.35)] transition-transform group-hover:scale-105"
          />
          <span className="font-display font-bold text-lg tracking-tight">
            <span className="text-gradient-cyan">КАКОВО</span>
            <span className="text-white">?!</span>
          </span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <div className="glass-card p-8 md:p-10">
            <div className="flex items-center justify-center mb-3">
              <span className="px-3 py-1 rounded-full text-[10px] uppercase tracking-widest bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30">
                admin
              </span>
            </div>
            <h1 className="font-display font-bold text-2xl text-white text-center mb-2">
              Вход администратора
            </h1>
            <p className="text-sm text-slate-500 text-center mb-8">
              Только для персонала
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="admin@example.com"
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
                {loading ? "Загрузка..." : "Войти"}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
