"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api, ServerConfig, Subscription } from "@/lib/api";
import Navbar from "@/components/Navbar";

export default function DashboardPage() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [configs, setConfigs] = useState<ServerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getSubscription(), api.getConfigs()])
      .then(([s, c]) => {
        setSub(s);
        setConfigs(c);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const copyLink = (link: string, name: string) => {
    navigator.clipboard.writeText(link);
    setCopied(name);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-void-950 bg-grid">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
          Загрузка...
        </div>
      </div>
    );
  }

  const daysLeft = sub?.ends_at
    ? Math.max(0, Math.ceil((new Date(sub.ends_at).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <main className="min-h-screen bg-grid">
      <Navbar />

      <div className="pt-24 pb-16 px-6 max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display font-bold text-2xl md:text-3xl text-white mb-8"
        >
          Личный кабинет
        </motion.h1>

        {/* Subscription card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-8 mb-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neon-cyan">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <h2 className="font-display font-semibold text-white text-lg">
              Подписка
            </h2>
          </div>

          {sub && sub.is_active ? (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-void-700/50 border border-white/5">
                  <div className="text-xs text-slate-500 mb-1">Тариф</div>
                  <div className="font-display font-semibold text-white">
                    {sub.plan.name}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-void-700/50 border border-white/5">
                  <div className="text-xs text-slate-500 mb-1">Осталось</div>
                  <div className="font-display font-semibold text-white">
                    {daysLeft} дней
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-void-700/50 border border-white/5">
                  <div className="text-xs text-slate-500 mb-1">Трафик</div>
                  <div className="font-display font-semibold text-white">
                    {sub.traffic_gb ? `${sub.traffic_gb} ГБ` : "Безлимит"}
                  </div>
                </div>
              </div>

              {/* Expiry progress */}
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>
                    Активна до{" "}
                    {new Date(sub.ends_at).toLocaleDateString("ru-RU")}
                  </span>
                  <span className={daysLeft < 7 ? "text-neon-amber" : "text-neon-green"}>
                    {daysLeft < 7 ? "Скоро истекает" : "Активна"}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-void-600 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      daysLeft < 7
                        ? "bg-gradient-to-r from-neon-amber to-red-500"
                        : "bg-gradient-to-r from-neon-green to-neon-cyan"
                    }`}
                    style={{
                      width: `${Math.min(100, (daysLeft / sub.plan.duration_days) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <Link href="/pricing" className="btn-neon inline-flex !py-2 !px-5 text-sm">
                Продлить
              </Link>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-slate-400 mb-4">Нет активной подписки</p>
              <Link href="/pricing" className="btn-solid !py-2.5 !px-6">
                Выбрать тариф
              </Link>
            </div>
          )}
        </motion.div>

        {/* Server configs */}
        {configs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neon-cyan">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                <line x1="6" y1="6" x2="6.01" y2="6" />
                <line x1="6" y1="18" x2="6.01" y2="18" />
              </svg>
              <h2 className="font-display font-semibold text-white text-lg">
                Ваши серверы
              </h2>
            </div>

            <div className="space-y-3">
              {configs.map((c) => (
                <div
                  key={c.server_name}
                  className="glass-card px-6 py-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{c.flag_emoji}</span>
                    <div>
                      <div className="font-medium text-white text-sm">
                        {c.server_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {c.server_location}
                      </div>
                    </div>
                  </div>

                  {c.sub_link && (
                    <button
                      onClick={() => copyLink(c.sub_link!, c.server_name)}
                      className="btn-neon !py-2 !px-4 text-xs gap-2"
                    >
                      {copied === c.server_name ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Скопировано
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          Копировать
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
