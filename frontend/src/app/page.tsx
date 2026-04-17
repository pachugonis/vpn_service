"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { api, Plan, ServerInfo } from "@/lib/api";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const features = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: "Молниеносная скорость",
    desc: "Современный протокол обеспечивает минимальные задержки и максимальную пропускную способность.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: "Полная приватность",
    desc: "Нулевые логи. Ваш трафик зашифрован и не может быть перехвачен или проанализирован.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    title: "Серверы в Европе",
    desc: "Германия, Нидерланды, Финляндия — выбирайте ближайшую локацию для лучшей скорости.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
    title: "Удобная оплата",
    desc: "Банковские карты РФ, СБП и Bitcoin. Моментальная активация после оплаты.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="7.5 4.21 12 6.81 16.5 4.21" />
        <polyline points="7.5 19.79 7.5 14.6 3 12" />
        <polyline points="21 12 16.5 14.6 16.5 19.79" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    title: "Любое устройство",
    desc: "Работает на всех устройствах: Windows, Mac, IPhone, Android.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    title: "Простая настройка",
    desc: "Скопируйте ссылку подписки — клиент автоматически подтянет конфигурацию всех серверов.",
  },
];

const fallbackPlans: Plan[] = [
  { id: 1, name: "1 месяц", duration_days: 30, price_rub: 299, price_usd: 2.99, traffic_gb: null },
  { id: 2, name: "3 месяца", duration_days: 90, price_rub: 749, price_usd: 7.49, traffic_gb: null },
  { id: 3, name: "1 год", duration_days: 365, price_rub: 2388, price_usd: 23.88, traffic_gb: null },
];

function monthlyPrice(plan: Plan): number {
  const months = Math.max(1, Math.round(plan.duration_days / 30));
  return Math.round(plan.price_rub / months);
}

export default function Home() {
  const [plans, setPlans] = useState<Plan[]>(fallbackPlans);
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [isAuthed, setIsAuthed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    api
      .getPlans()
      .then((p) => p.length > 0 && setPlans(p))
      .catch(() => {});
    api
      .getPublicServers()
      .then((s) => setServers(s))
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

  const handleSelectPlan = (planId: number) => {
    if (isAuthed) {
      router.push(`/payment?plan=${planId}`);
    } else {
      router.push(`/auth?redirect=/payment&plan=${planId}`);
    }
  };

  const baseMonthly = plans.length ? monthlyPrice(plans[0]) : 0;
  const minMonthly = plans.length
    ? Math.min(...plans.map(monthlyPrice))
    : 0;
  const popularPlan = plans.length === 3 ? plans[1] : null;

  return (
    <main className="min-h-screen flex flex-col bg-grid">
      <Navbar />

      {/* ─── HERO ─── */}
      <section className="relative pt-28 pb-16 md:pt-44 md:pb-32 px-4 sm:px-6 overflow-hidden">
        {/* Decorative orb */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[90vw] max-w-[600px] h-[90vw] max-h-[600px] rounded-full bg-gradient-to-b from-neon-cyan/[0.06] to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-display font-extrabold text-[2.75rem] sm:text-[3.3rem] md:text-[4.95rem] leading-[1.1] tracking-tight mb-6"
          >
            <span className="text-gradient-cyan">КАКОВО</span><span className="text-white">?!</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Быстрый VPN с серверами в Европе и США. Современный протокол, нулевые логи,
            моментальное подключение. От{" "}
            <span className="text-white font-semibold">{minMonthly} ₽/мес</span>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/pricing" className="btn-solid text-base !px-8 !py-3.5">
              Выбрать тариф
            </Link>
            <Link href="/#features" className="btn-neon text-base !px-8 !py-3.5">
              Узнать больше
            </Link>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="mt-14 flex flex-wrap justify-center gap-10 md:gap-16"
          >
            {[
              { value: servers.length > 0 ? String(servers.length) : "—", label: "локации" },
              { value: "99.9%", label: "uptime" },
              { value: "0", label: "логов" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-display font-bold text-2xl md:text-3xl text-white">
                  {stat.value}
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-20 md:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <motion.p
              variants={fadeUp}
              custom={0}
              className="text-xs font-semibold text-neon-cyan uppercase tracking-[0.2em] mb-3"
            >
              Возможности
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="font-display font-bold text-3xl md:text-4xl text-white"
            >
              Всё, что нужно для свободного интернета
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                custom={i}
                className="glass-card p-7 group"
              >
                <div className="w-11 h-11 rounded-lg bg-neon-cyan/[0.08] border border-neon-cyan/10 flex items-center justify-center text-neon-cyan mb-5 group-hover:bg-neon-cyan/[0.15] group-hover:border-neon-cyan/25 transition-all">
                  {f.icon}
                </div>
                <h3 className="font-display font-semibold text-white text-base mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── SERVERS ─── */}
      <section id="servers" className="py-20 md:py-28 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <motion.p
              variants={fadeUp}
              custom={0}
              className="text-xs font-semibold text-neon-cyan uppercase tracking-[0.2em] mb-3"
            >
              Серверы
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="font-display font-bold text-3xl md:text-4xl text-white"
            >
              Локации
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="space-y-3"
          >
            {servers.length === 0 && (
              <div className="text-center text-sm text-slate-500 py-8">
                Серверы скоро появятся
              </div>
            )}
            {servers.map((s, i) => (
              <motion.div
                key={s.id}
                variants={fadeUp}
                custom={i}
                className="glass-card px-4 sm:px-6 py-5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{s.flag_emoji || "\u{1F310}"}</span>
                  <div>
                    <div className="font-display font-semibold text-white text-sm">
                      {s.name}
                    </div>
                    <div className="text-xs text-slate-500 uppercase">
                      {s.location}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6">
                  {/* Load bar */}
                  <div className="hidden sm:block min-w-[120px]">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Нагрузка</span>
                      <span className="text-slate-400 font-mono">{s.load_pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-void-600 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-neon-green to-neon-cyan transition-all"
                        style={{ width: `${s.load_pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <span className="status-dot" />
                    <span className="text-xs text-neon-green font-medium">Online</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-20 md:py-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <motion.p
              variants={fadeUp}
              custom={0}
              className="text-xs font-semibold text-neon-cyan uppercase tracking-[0.2em] mb-3"
            >
              Тарифы
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="font-display font-bold text-3xl md:text-4xl text-white"
            >
              Простое ценообразование
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-slate-400 mt-4 max-w-md mx-auto"
            >
              Все тарифы включают доступ ко всем серверам и безлимитный трафик.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid md:grid-cols-3 gap-5"
          >
            {plans.map((p, i) => {
              const isPopular = popularPlan && p.id === popularPlan.id;
              const monthly = monthlyPrice(p);
              const save =
                i > 0 && baseMonthly > 0
                  ? `-${Math.round(((baseMonthly - monthly) / baseMonthly) * 100)}%`
                  : null;
              return (
              <motion.div
                key={p.id}
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
                    ПОПУЛЯРНЫЙ
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display font-semibold text-white text-lg">
                      {p.name}
                    </h3>
                    {save && (
                      <span className="px-2 py-0.5 rounded-md bg-neon-green/10 text-neon-green text-xs font-bold">
                        {save}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{p.duration_days} дней</p>
                </div>

                <div className="mb-8">
                  <span className="font-display font-extrabold text-4xl text-white">
                    {monthly} ₽
                  </span>
                  <span className="text-slate-500 text-sm">/мес</span>
                  <div className="text-xs text-slate-600 mt-1 font-mono">
                    итого {p.price_rub} ₽
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    "Все серверы",
                    "Безлимитный трафик",
                    "До 3 устройств",
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
                  onClick={() => handleSelectPlan(p.id)}
                  className={isPopular ? "btn-solid w-full" : "btn-neon w-full"}
                >
                  Выбрать
                </button>
              </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 md:py-28 px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto glass-card p-8 sm:p-10 md:p-14 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/[0.03] to-neon-blue/[0.03]" />
          <div className="relative">
            <h2 className="font-display font-bold text-2xl md:text-3xl text-white mb-4">
              Готовы к свободному интернету?
            </h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              Подключитесь за 2 минуты. Оплатите картой, СБП или биткоином — и
              получите доступ ко всем серверам.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/pricing" className="btn-solid !px-8 !py-3.5">
                Начать сейчас
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      <Footer />
    </main>
  );
}
