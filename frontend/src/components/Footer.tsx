import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-neon-cyan to-neon-blue flex items-center justify-center">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#040810"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span className="font-display font-bold text-white">
                Void<span className="text-neon-cyan">VPN</span>
              </span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed">
              Быстрый и приватный доступ к интернету без ограничений.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Сервис
            </h4>
            <ul className="space-y-2.5">
              {["Тарифы", "Серверы", "Статус"].map((item) => (
                <li key={item}>
                  <Link
                    href="/pricing"
                    className="text-sm text-slate-500 hover:text-neon-cyan transition-colors"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Помощь
            </h4>
            <ul className="space-y-2.5">
              {["Настройка", "FAQ", "Поддержка"].map((item) => (
                <li key={item}>
                  <Link
                    href="#"
                    className="text-sm text-slate-500 hover:text-neon-cyan transition-colors"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Оплата
            </h4>
            <div className="flex flex-wrap gap-2">
              {["Visa", "MC", "МИР", "СБП", "BTC"].map((m) => (
                <span
                  key={m}
                  className="text-xs px-2.5 py-1 rounded-md bg-void-700 text-slate-400 border border-white/5"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()} VoidVPN. Все права защищены.
          </p>
          <div className="flex gap-6">
            <Link
              href="#"
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              Политика конфиденциальности
            </Link>
            <Link
              href="#"
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              Условия использования
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
