import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Условия использования — КАКОВО?!",
  description: "Условия использования VPN-сервиса КАКОВО?!",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-void-900 text-slate-200">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-16 w-full">
        <h1 className="font-display text-3xl sm:text-4xl font-bold mb-8">
          <span className="text-gradient-cyan">Условия</span>{" "}
          <span className="text-white">использования</span>
        </h1>
        <p className="text-xs text-slate-500 mb-10">
          Последнее обновление: 14 апреля 2026 г.
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-slate-400">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Принятие условий</h2>
            <p>
              Регистрируясь в сервисе КАКОВО?! (далее — «Сервис»), вы подтверждаете, что прочитали,
              поняли и согласны соблюдать настоящие Условия. Если вы не согласны с каким-либо
              пунктом — прекратите использование Сервиса.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Описание услуги</h2>
            <p>
              Сервис предоставляет доступ к VPN-серверам в различных локациях на условиях подписки.
              Сервис не гарантирует 100% времени бесперебойной работы, но прилагает все разумные
              усилия для поддержания доступности инфраструктуры.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Оплата и подписки</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Оплата производится заранее за выбранный период (1, 3 или 12 месяцев).</li>
              <li>Подписка активируется автоматически после подтверждения платежа.</li>
              <li>Срок действия подписки начинается с момента её активации.</li>
              <li>Автоматическое продление подписок не производится.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Возвраты</h2>
            <p>
              Возврат средств возможен в течение 7 дней с момента оплаты при условии, что сервис
              не использовался или неработоспособен по нашей вине. Для возврата напишите в
              поддержку с описанием причины.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Допустимое использование</h2>
            <p className="mb-2">Пользователю запрещается:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Использовать Сервис для рассылки спама, фишинга и вредоносного ПО.</li>
              <li>Проводить DDoS-атаки и иную сетевую деструктивную активность.</li>
              <li>Распространять материалы, нарушающие авторские права.</li>
              <li>Передавать учётные данные третьим лицам или перепродавать доступ.</li>
            </ul>
            <p className="mt-3">
              Нарушение правил влечёт немедленную блокировку без возврата средств.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Ограничение ответственности</h2>
            <p>
              Сервис предоставляется «как есть». Мы не несём ответственности за ущерб, возникший
              в результате использования или невозможности использования Сервиса, включая потерю
              данных и упущенную выгоду.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Изменения условий</h2>
            <p>
              Мы вправе вносить изменения в настоящие Условия. Актуальная версия всегда доступна
              на данной странице. Продолжение использования Сервиса после изменений означает
              согласие с новой редакцией.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Контакты</h2>
            <p>
              По всем вопросам —{" "}
              <a href="mailto:ffs.pachugonis@gmail.com" className="text-neon-cyan hover:underline">
                ffs.pachugonis@gmail.com
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
