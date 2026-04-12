"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function PaymentFailedPage() {
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
          className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-8"
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-red-400"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </motion.div>

        <h1 className="font-display font-bold text-3xl text-white mb-3">
          Ошибка оплаты
        </h1>
        <p className="text-slate-400 mb-8 leading-relaxed">
          Что-то пошло не так при обработке платежа. Попробуйте ещё раз или
          выберите другой способ оплаты.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/pricing" className="btn-solid !px-8 !py-3.5">
            Попробовать снова
          </Link>
          <Link href="/" className="btn-neon !px-8 !py-3.5">
            На главную
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
