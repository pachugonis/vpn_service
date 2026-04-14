"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, Plan } from "@/lib/api";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const fallbackPlans: Plan[] = [
  { id: 1, name: "1 месяц", duration_days: 30, price_rub: 299, traffic_gb: null },
  { id: 2, name: "3 месяца", duration_days: 90, price_rub: 749, traffic_gb: null },
  { id: 3, name: "1 год", duration_days: 365, price_rub: 2388, traffic_gb: null },
];

function monthlyPrice(plan: Plan): number {
  const months = Math.max(1, Math.round(plan.duration_days / 30));
  return Math.round(plan.price_rub / months);
}

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>(fallbackPlans);
  const [isAuthed, setIsAuthed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    api
      .getPlans()
      .then((p) => p.length > 0 && setPlans(p))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const check = () => {
      if (typeof window === "undefined") return;
      setIsAuthed(!!localStorage.getItem("token"));
    };
    check();
    window.addEventListener("auth-change", check);
    window.addEventListener("storage", check);
    return () => {
      window.removeEventListener("auth-change", check);
      window.removeEventListener("storage", check);
    };
  }, []);

  const handleSelect = (planId: number) => {
    if (isAuthed) {
      router.push(`/payment?plan=${planId}`);
    } else {
      router.push(`/auth?redirect=/payment&plan=${planId}`);
    }
  };

  const bestValue = plans.length === 3 ? plans[1] : null;

  return (
    <main className="min-h-screen flex flex-col bg-grid">
      <Navbar />

      <section className="pt-32 pb-20 md:pt-40 md:pb-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            className="text-center mb-16"
          >
            <motion.p
              variants={fadeUp}
              custom={0}
              className="text-xs font-semibold text-neon-cyan uppercase tracking-[0.2em] mb-3"
            >
              Тарифы
            </motion.p>
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="font-display font-bold text-3xl md:text-5xl text-white mb-4"
            >
              Выберите свой план
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-slate-400 max-w-lg mx-auto"
            >
              Все тарифы включают доступ ко всем серверам, безлимитный трафик и
              поддержку 24/7. Чем дольше срок — тем выгоднее.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            className="grid md:grid-cols-3 gap-5"
          >
            {plans.map((plan, i) => {
              const isPopular = bestValue && plan.id === bestValue.id;
              const monthly = monthlyPrice(plan);
              const baseMonthly = monthlyPrice(plans[0]);
              const discount =
                i > 0
                  ? `-${Math.round(((baseMonthly - monthly) / baseMonthly) * 100)}%`
                  : null;

              return (
                <motion.div
                  key={plan.id}
                  variants={fadeUp}
                  custom={i}
                  className={`glass-card p-8 flex flex-col relative ${
                    isPopular
                      ? "!border-neon-cyan/30 shadow-[0_0_40px_rgba(0,229,255,0.06)]"
                      : ""
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-neon-cyan to-neon-blue text-xs font-bold text-void-950 tracking-wide">
                      ЛУЧШАЯ ЦЕНА
                    </div>
                  )}

                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-display font-semibold text-white text-lg">
                        {plan.name}
                      </h2>
                      {discount && (
                        <span className="px-2 py-0.5 rounded-md bg-neon-green/10 text-neon-green text-xs font-bold">
                          {discount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {plan.duration_days} дней
                      {plan.traffic_gb ? ` / ${plan.traffic_gb} ГБ` : " / безлимит"}
                    </p>
                  </div>

                  <div className="mb-2">
                    <span className="font-display font-extrabold text-4xl text-white">
                      {monthly} ₽
                    </span>
                    <span className="text-slate-500 text-sm">/мес</span>
                  </div>
                  <div className="text-xs text-slate-600 font-mono mb-8">
                    Итого: {plan.price_rub} ₽
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {[
                      "Все серверы Европы",
                      "Безлимитный трафик",
                      "До 3 устройств",
                      "VLESS + XTLS-Reality",
                      "Поддержка 24/7",
                    ].map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2.5 text-sm text-slate-300"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-neon-cyan flex-shrink-0"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSelect(plan.id)}
                    className={isPopular ? "btn-solid w-full" : "btn-neon w-full"}
                  >
                    Выбрать план
                  </button>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Payment methods */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-16 text-center"
          >
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-4">
              Способы оплаты
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { label: "Visa / MC / МИР", icon: "💳" },
                { label: "СБП", icon: "📱" },
                { label: "Bitcoin", icon: "₿" },
                { label: "Lightning", icon: "⚡" },
              ].map((m) => (
                <div
                  key={m.label}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-void-700/50 border border-white/5 text-sm text-slate-400"
                >
                  <span>{m.icon}</span>
                  {m.label}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
