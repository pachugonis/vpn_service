import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Настройка — КАКОВО?!",
  description:
    "Пошаговая инструкция: как зарегистрироваться, оплатить подписку и подключить VPN в клиенте Happ.",
};

interface Step {
  title: string;
  description: string;
  image: string;
}

const steps: Step[] = [
  {
    title: "Зарегистрируйтесь на сайте",
    description:
      "Откройте страницу регистрации, укажите email и придумайте пароль. После отправки формы вы попадёте в личный кабинет.",
    image: "/setup/step1.png",
  },
  {
    title: "Перейдите в личный кабинет",
    description:
      "Пока подписки нет, вы увидите карточку «Подписка» с пометкой «Нет активной подписки». Нажмите «Выбрать тариф».",
    image: "/setup/step2.png",
  },
  {
    title: "Выберите тариф",
    description:
      "Доступны планы на 1 месяц, 3 месяца и 1 год. Все тарифы включают доступ ко всем серверам и безлимитный трафик. Нажмите «Выбрать план».",
    image: "/setup/step3.png",
  },
  {
    title: "Выберите способ оплаты",
    description:
      "Доступны ЮKassa (карты РФ), Bitcoin и Platega. Нажмите на нужный способ и завершите оплату на странице провайдера.",
    image: "/setup/step4.png",
  },
  {
    title: "Скопируйте единую ссылку подписки",
    description:
      "После успешной оплаты в личном кабинете появится карточка «Единая ссылка подписки». Нажмите «Копировать» — эта ссылка автоматически подтягивает все серверы.",
    image: "/setup/step5.png",
  },
  {
    title: "Установите клиент Happ",
    description:
      "Скачайте приложение Happ для вашей платформы и запустите его. При первом запуске список серверов будет пуст.",
    image: "/setup/step6.png",
  },
  {
    title: "Добавьте подписку в Happ",
    description:
      "Нажмите «Добавить», выберите тип «Подписка», укажите любое имя и вставьте скопированную ссылку в поле «URL подписки». Подтвердите добавление.",
    image: "/setup/step7.png",
  },
  {
    title: "Выберите сервер и подключайтесь",
    description:
      "В списке появятся все наши локации: Финляндия, Латвия, Польша, США. Выберите любую и нажмите кнопку включения — VPN готов к работе.",
    image: "/setup/step8.png",
  },
];

export default function SetupPage() {
  return (
    <div className="min-h-screen flex flex-col bg-void-900 text-slate-200">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-16 w-full">
        <h1 className="font-display text-3xl sm:text-4xl font-bold mb-4">
          <span className="text-gradient-cyan">Настройка</span>{" "}
          <span className="text-white">VPN</span>
        </h1>
        <p className="text-sm text-slate-500 mb-10 leading-relaxed">
          От регистрации до первого подключения — 8 шагов.
        </p>

        <ol className="space-y-8">
          {steps.map((step, index) => (
            <li
              key={index}
              className="rounded-xl border border-slate-800 bg-void-800/50 overflow-hidden"
            >
              <div className="p-5 sm:p-6">
                <div className="flex items-start gap-4 mb-4">
                  <span className="shrink-0 w-9 h-9 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan font-display font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-white mb-1.5">
                      {step.title}
                    </h2>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
                <div className="rounded-lg overflow-hidden border border-slate-800 bg-void-900">
                  <img
                    src={step.image}
                    alt={`Шаг ${index + 1}: ${step.title}`}
                    loading="lazy"
                    className="w-full h-auto block"
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-12 rounded-xl border border-slate-800 bg-void-800/50 p-6 text-center">
          <p className="text-sm text-slate-400 mb-4">
            Остались вопросы? Напишите нам — мы поможем.
          </p>
          <a
            href="/support"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-neon-cyan text-void-900 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Связаться с поддержкой
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
