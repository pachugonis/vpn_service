"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import Logo from "@/components/Logo";

function PaymentForm() {
  const params = useSearchParams();
  const planId = Number(params.get("plan") || 0);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handlePay = async (method: "card" | "sbp" | "btc") => {
    if (!planId) {
      setError("Тариф не выбран");
      return;
    }
    setLoading(method);
    setError("");
    try {
      let result;
      if (method === "btc") {
        result = await api.createBtcPayment(planId);
      } else {
        const paymentMethod = method === "sbp" ? 2 : 10;
        result = await api.createPlategaPayment(planId, paymentMethod);
      }
      window.location.href = result.redirect_url;
    } catch (err: any) {
      setError(err.message || "Ошибка при создании платежа");
      setLoading(null);
    }
  };

  const methods = [
    {
      id: "card" as const,
      icon: "💳",
      title: "Банковская карта",
      desc: "Visa, Mastercard, МИР",
      accent: "from-neon-blue to-indigo-500",
    },
    {
      id: "sbp" as const,
      icon: "📱",
      title: "СБП",
      desc: "Оплата через QR-код",
      accent: "from-neon-green to-emerald-500",
    },
    {
      id: "btc" as const,
      icon: "₿",
      title: "Bitcoin",
      desc: "Bitcoin и Lightning Network",
      accent: "from-neon-amber to-orange-500",
    },
  ];

  return (
    <main className="min-h-screen flex flex-col bg-grid">
      {/* Minimal nav */}
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

            <div className="space-y-3">
              {methods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handlePay(m.id)}
                  disabled={loading !== null}
                  className="w-full glass-card !rounded-xl px-5 py-4 flex items-center gap-4 text-left hover:!border-neon-cyan/25 disabled:opacity-50 transition-all group"
                >
                  <div
                    className={`w-11 h-11 rounded-lg bg-gradient-to-br ${m.accent} flex items-center justify-center text-lg flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity`}
                  >
                    {m.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm">
                      {m.title}
                    </div>
                    <div className="text-xs text-slate-500">{m.desc}</div>
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
              ))}
            </div>

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
            Безопасная оплата через Platega и BTCPay Server
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
