"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { api, type PaymentMethodInfo } from "@/lib/api";
import Logo from "@/components/Logo";

type ProviderId = PaymentMethodInfo["id"];

const PROVIDER_VISUAL: Record<
  ProviderId,
  { icon: string; accent: string; caption: string }
> = {
  platega: {
    icon: "💳",
    accent: "from-neon-blue to-indigo-500",
    caption: "Оплата картой РФ",
  },
  yookassa: {
    icon: "💳",
    accent: "from-neon-green to-emerald-500",
    caption: "Оплата картой РФ",
  },
  btcpay: {
    icon: "₿",
    accent: "from-neon-amber to-orange-500",
    caption: "Оплата Bitcoin",
  },
};

function PaymentForm() {
  const params = useSearchParams();
  const planId = Number(params.get("plan") || 0);
  const [methods, setMethods] = useState<PaymentMethodInfo[] | null>(null);
  const [loading, setLoading] = useState<ProviderId | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getPaymentMethods()
      .then((res) => setMethods(res.methods))
      .catch(() => setMethods([]));
  }, []);

  const handlePay = async (provider: ProviderId) => {
    if (!planId) {
      setError("Тариф не выбран");
      return;
    }
    setLoading(provider);
    setError("");
    try {
      let result;
      if (provider === "platega") {
        result = await api.createPlategaPayment(planId, 10);
      } else if (provider === "yookassa") {
        result = await api.createYookassaPayment(planId);
      } else {
        result = await api.createBtcPayment(planId);
      }
      window.location.href = result.redirect_url;
    } catch (err: any) {
      setError(err.message || "Ошибка при создании платежа");
      setLoading(null);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-grid">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2.5 group w-fit">
          <Logo size={34} className="drop-shadow-[0_0_10px_rgba(34,211,238,0.35)] transition-transform group-hover:scale-105" />
          <span className="font-display font-bold text-lg tracking-tight">
            <span className="text-gradient-cyan">КАКОВО</span><span className="text-white">?!</span>
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
              Способ оплаты
            </h1>
            <p className="text-sm text-slate-500 text-center mb-8">
              Выберите удобный для вас способ
            </p>

            {error && (
              <div className="mb-6 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {methods === null ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
              </div>
            ) : methods.filter((m) => m.enabled).length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-6">
                Нет настроенных способов оплаты. Свяжитесь с поддержкой.
              </div>
            ) : (
              <div className="space-y-3">
                {methods.map((m) => {
                  const visual = PROVIDER_VISUAL[m.id];
                  const disabled = !m.enabled || loading !== null;
                  return (
                    <button
                      key={m.id}
                      onClick={() => handlePay(m.id)}
                      disabled={disabled}
                      title={
                        !m.enabled
                          ? "Способ оплаты временно недоступен"
                          : undefined
                      }
                      className="w-full glass-card !rounded-xl px-5 py-4 flex items-center gap-4 text-left hover:!border-neon-cyan/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:!border-transparent transition-all group"
                    >
                      <div
                        className={`w-11 h-11 rounded-lg bg-gradient-to-br ${visual.accent} flex items-center justify-center text-lg flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity`}
                      >
                        {visual.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-sm flex items-center gap-2">
                          {m.title}
                          {!m.enabled && (
                            <span className="text-[10px] uppercase tracking-wide text-slate-500 border border-slate-700 rounded px-1.5 py-0.5">
                              недоступно
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {visual.caption}
                        </div>
                      </div>
                      {loading === m.id ? (
                        <div className="w-5 h-5 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
                      ) : (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-6 text-center">
              <Link
                href="/pricing"
                className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                &larr; Назад к тарифам
              </Link>
            </div>
          </div>

          <p className="text-xs text-slate-600 text-center mt-4">
            Безопасная оплата через Platega, ЮKassa и BTCPay Server
          </p>
        </motion.div>
      </div>
    </main>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-void-950">
          <div className="text-slate-500">Загрузка...</div>
        </div>
      }
    >
      <PaymentForm />
    </Suspense>
  );
}
