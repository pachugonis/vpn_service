"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import Logo from "@/components/Logo";

const BYPASS_PREFIXES = ["/admin-login", "/admin"];

export default function MaintenanceGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/";
  const [checked, setChecked] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const s = await api.getPublicSettings();
        if (cancelled) return;
        if (!s.maintenance_mode) {
          setBlocked(false);
          setChecked(true);
          return;
        }
        if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
          setBlocked(false);
          setChecked(true);
          return;
        }
        try {
          const me = await api.me();
          if (cancelled) return;
          setBlocked(!me.is_admin);
        } catch {
          if (!cancelled) setBlocked(true);
        }
      } catch {
        if (!cancelled) setBlocked(false);
      } finally {
        if (!cancelled) setChecked(true);
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
      </div>
    );
  }

  if (blocked) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-grid">
        <Link href="/" className="flex items-center gap-2.5 mb-10">
          <Logo size={42} className="drop-shadow-[0_0_12px_rgba(34,211,238,0.4)]" />
          <span className="font-display font-bold text-xl tracking-tight">
            <span className="text-gradient-cyan">КАКОВО</span>
            <span className="text-white">?!</span>
          </span>
        </Link>
        <div className="glass-card p-10 max-w-md">
          <div className="text-5xl mb-5">🛠️</div>
          <h1 className="font-display font-bold text-2xl text-white mb-3">
            Технические работы
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Сайт временно недоступен. Мы обновляем систему и скоро вернёмся.
            Спасибо за терпение.
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
