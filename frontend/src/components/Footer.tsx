import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <Logo size={28} />
              <span className="font-display font-bold">
                <span className="text-gradient-cyan">КАКОВО</span><span className="text-white">?!</span>
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
              {[
                { label: "Тарифы", href: "/pricing" },
                { label: "Серверы", href: "/#servers" },
                { label: "Статус", href: "/#servers" },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-sm text-slate-500 hover:text-neon-cyan transition-colors"
                  >
                    {item.label}
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
              {[
                { label: "Настройка", href: "#" },
                { label: "FAQ", href: "/faq" },
                { label: "Поддержка", href: "/support" },
                { label: "Контакты", href: "/contacts" },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-sm text-slate-500 hover:text-neon-cyan transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Оплата
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: "Visa", src: "/payment-logos/visa.svg" },
                { label: "Mastercard", src: "/payment-logos/mastercard.svg" },
                { label: "МИР", src: "/payment-logos/mir.svg" },
                { label: "СБП", src: "/payment-logos/sbp.svg" },
                { label: "Bitcoin", src: "/payment-logos/bitcoin.svg" },
              ].map((m) => (
                <span
                  key={m.label}
                  className="h-8 w-14 flex items-center justify-center rounded-md bg-white/90 border border-white/5 px-2"
                >
                  <img
                    src={m.src}
                    alt={m.label}
                    className="max-h-5 max-w-full object-contain"
                  />
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()} КАКОВО?! Все права защищены.
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link
              href="/privacy"
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              Политика конфиденциальности
            </Link>
            <Link
              href="/terms"
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
