import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Контакты — КАКОВО?!",
  description: "Контактная информация VPN-сервиса КАКОВО?!",
};

export default function ContactsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-void-900 text-slate-200">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-16 w-full">
        <h1 className="font-display text-3xl sm:text-4xl font-bold mb-4">
          <span className="text-gradient-cyan">Контакты</span>
        </h1>
        <p className="text-sm text-slate-400 mb-10 leading-relaxed">
          Свяжитесь с нами любым удобным способом — мы на связи и отвечаем
          быстро.
        </p>

        <div className="space-y-6">
          <div className="glass-card p-6 sm:p-8">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Электронная почта
            </h2>
            <a
              href="mailto:ffs.pachugonis@gmail.com"
              className="text-lg text-neon-cyan hover:underline"
            >
              ffs.pachugonis@gmail.com
            </a>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Общие вопросы, сотрудничество, работа с персональными данными.
            </p>
          </div>

          <div className="glass-card p-6 sm:p-8">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Служба поддержки
            </h2>
            <Link
              href="/support"
              className="text-lg text-neon-cyan hover:underline"
            >
              Форма обратной связи
            </Link>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Технические вопросы, проблемы с подключением, оплата и настройка
              клиента. Сообщение попадает напрямую в телеграм дежурной смены.
            </p>
          </div>

          <div className="glass-card p-6 sm:p-8">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Часы работы
            </h2>
            <p className="text-sm text-slate-300">
              Ежедневно, круглосуточно
            </p>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Автоматические системы работают 24/7. Ответ оператора — в течение
              нескольких часов.
            </p>
          </div>

          <div className="glass-card p-6 sm:p-8">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Реквизиты
            </h2>
            <dl className="text-sm space-y-2">
              <div className="flex flex-col sm:flex-row sm:gap-3">
                <dt className="text-slate-500 sm:w-24 shrink-0">ФИО</dt>
                <dd className="text-slate-300">Пачугонис Игорь Людасович</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-3">
                <dt className="text-slate-500 sm:w-24 shrink-0">ИНН</dt>
                <dd className="text-slate-300 font-mono">320400001200</dd>
              </div>
            </dl>
          </div>

          <div className="glass-card p-6 sm:p-8">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Полезные ссылки
            </h2>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/faq" className="text-neon-cyan hover:underline">
                  Частые вопросы (FAQ)
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-neon-cyan hover:underline">
                  Тарифы
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-neon-cyan hover:underline">
                  Политика конфиденциальности
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-neon-cyan hover:underline">
                  Условия использования
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
