import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Политика конфиденциальности — КАКОВО?!",
  description: "Политика конфиденциальности VPN-сервиса КАКОВО?!",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-void-900 text-slate-200">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-16 w-full">
        <h1 className="font-display text-3xl sm:text-4xl font-bold mb-8">
          <span className="text-gradient-cyan">Политика</span>{" "}
          <span className="text-white">конфиденциальности</span>
        </h1>
        <p className="text-xs text-slate-500 mb-10">
          Последнее обновление: 14 апреля 2026 г.
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-slate-400">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Общие положения</h2>
            <p>
              Настоящая Политика описывает, какие данные сервис КАКОВО?! (далее — «Сервис»)
              собирает, как использует и защищает. Используя Сервис, вы соглашаетесь с условиями
              данной Политики.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Какие данные мы собираем</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Адрес электронной почты — для регистрации и отправки конфигураций.</li>
              <li>Хеш пароля — мы не храним пароли в открытом виде.</li>
              <li>Информация об оплаченных подписках и истории платежей.</li>
              <li>Технические данные о работе VPN-серверов без привязки к активности пользователей.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Чего мы не собираем</h2>
            <p>
              Мы не ведём логи посещаемых сайтов, DNS-запросов, IP-адресов источника и назначения,
              а также не храним историю VPN-трафика. Сервис спроектирован по принципу{" "}
              <span className="text-neon-cyan">no-logs</span>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Платёжные данные</h2>
            <p>
              Платежи обрабатываются сторонними провайдерами (Platega.io, BTCPay Server). Сервис не
              получает и не хранит реквизиты банковских карт — только идентификатор транзакции
              и её статус.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Передача данных третьим лицам</h2>
            <p>
              Мы не передаём персональные данные третьим лицам, за исключением случаев, прямо
              предусмотренных законодательством страны размещения инфраструктуры.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Cookies</h2>
            <p>
              Сервис использует только технически необходимые cookies для поддержания сессии
              авторизации. Рекламные и аналитические cookies не применяются.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Удаление аккаунта</h2>
            <p>
              Вы можете в любой момент запросить удаление аккаунта и всех связанных данных,
              написав в службу поддержки. Данные будут удалены в течение 7 дней.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Контакты</h2>
            <p>
              По вопросам обработки персональных данных напишите нам на{" "}
              <a href="mailto:support@kakovo.vpn" className="text-neon-cyan hover:underline">
                support@kakovo.vpn
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
