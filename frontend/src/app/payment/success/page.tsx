"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/lib/api";

type Verdict = "checking" | "confirmed";

const MAX_ATTEMPTS = 8;
const POLL_INTERVAL_MS = 1500;

export default function PaymentSuccessPage() {
  const router = useRouter();
  const [verdict, setVerdict] = useState<Verdict>("checking");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const check = async () => {
      attempts += 1;
      try {
        const latest = await api.getLatestPayment();
        if (cancelled) return;

        if (latest?.status === "confirmed") {
          setVerdict("confirmed");
          return;
        }

        const finalStatuses = ["canceled", "failed", "chargebacked"];
        if (latest && finalStatuses.includes(latest.status)) {
          router.replace("/dashboard");
          return;
        }

        if (attempts >= MAX_ATTEMPTS) {
          router.replace("/dashboard");
          return;
        }

        setTimeout(check, POLL_INTERVAL_MS);
      } catch {
        if (cancelled) return;
        setVerdict("confirmed");
      }
    };

    check();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (verdict === "checking") {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-grid">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Проверяем статус оплаты...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-grid">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-20 h-20 rounded-full bg-neon-green/10 border border-neon-green/20 flex items-center justify-center mx-auto mb-8"
        >
          <motion.svg
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-neon-green"
          >
            <polyline points="20 6 9 17 4 12" />
          </motion.svg>
        </motion.div>

        <h1 className="font-display font-bold text-3xl text-white mb-3">
          Оплата прошла!
        </h1>
        <p className="text-slate-400 mb-8 leading-relaxed">
          Ваша VPN-подписка активирована. Перейдите в личный кабинет, чтобы
          получить конфигурации для подключения.
        </p>
        <Link href="/dashboard" className="btn-solid !px-8 !py-3.5">
          Перейти в кабинет
        </Link>
      </motion.div>
    </main>
  );
}
