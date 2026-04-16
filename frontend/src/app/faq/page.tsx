"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "Что такое КАКОВО?! VPN?",
    answer:
      "КАКОВО?! — это VPN-сервис с серверами в нескольких странах. После оплаты вы получаете доступ ко всем локациям одновременно. Мы используем протокол VLESS + XTLS-Reality, который обеспечивает высокую скорость и устойчивость к блокировкам.",
  },
  {
    question: "Какие протоколы и приложения поддерживаются?",
    answer:
      "Мы используем протокол VLESS с технологией XTLS-Reality. Для подключения подойдут приложения: V2rayN (Windows), V2rayNG (Android), Streisand или Wings X (iOS/macOS), Nekoray (Linux). После оплаты вы получите ссылку подписки, которую нужно вставить в любое из этих приложений.",
  },
  {
    question: "Сколько устройств можно подключить?",
    answer:
      "Ограничения по количеству устройств нет. Вы можете использовать один и тот же конфиг на всех своих устройствах: телефоне, компьютере, планшете и т.д.",
  },
  {
    question: "Как происходит оплата?",
    answer:
      "Мы принимаем банковские карты РФ, СБП и Bitcoin (включая Lightning Network). После оплаты подписка активируется автоматически в течение нескольких секунд.",
  },
  {
    question: "Можно ли оплатить биткоином?",
    answer:
      "Да, мы принимаем Bitcoin и Lightning Network через собственный BTCPay Server. Цена при оплате биткоином указана в USD. После подтверждения транзакции подписка активируется автоматически.",
  },
  {
    question: "Что произойдёт, когда подписка истечёт?",
    answer:
      "За 3 дня до окончания подписки мы отправим напоминание на вашу почту. После истечения срока доступ к VPN будет приостановлен. Вы можете продлить подписку в любой момент — при продлении дни добавляются к текущему сроку.",
  },
  {
    question: "Как продлить подписку?",
    answer:
      "Зайдите в личный кабинет и нажмите «Продлить подписку». Выберите тариф и оплатите удобным способом. Дополнительные дни будут добавлены к текущему сроку действия.",
  },
  {
    question: "Есть ли ограничение по трафику?",
    answer:
      "Зависит от выбранного тарифа. Большинство наших планов предоставляют безлимитный трафик. Подробности указаны на странице тарифов.",
  },
  {
    question: "VPN не подключается. Что делать?",
    answer:
      "Убедитесь, что вы используете актуальную версию приложения и правильно скопировали ссылку подписки. Попробуйте переключиться на другую локацию. Если проблема сохраняется — напишите в поддержку, мы поможем.",
  },
  {
    question: "Вы храните логи?",
    answer:
      "Мы не ведём логов вашей активности. Мы не записываем, какие сайты вы посещаете и какой трафик проходит через наши серверы. Хранятся только данные, необходимые для работы сервиса: email, информация о подписке и платежах.",
  },
  {
    question: "Как связаться с поддержкой?",
    answer:
      "Перейдите на страницу «Поддержка» и заполните форму обратной связи. Мы стараемся отвечать в течение 24 часов.",
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(index: number) {
    setOpenIndex(openIndex === index ? null : index);
  }

  return (
    <div className="min-h-screen flex flex-col bg-void-900 text-slate-200">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-16 w-full">
        <h1 className="font-display text-3xl sm:text-4xl font-bold mb-4">
          <span className="text-gradient-cyan">Частые</span>{" "}
          <span className="text-white">вопросы</span>
        </h1>
        <p className="text-sm text-slate-500 mb-10">
          Ответы на самые популярные вопросы о сервисе КАКОВО?!
        </p>

        <div className="space-y-3">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="rounded-xl border border-slate-800 bg-void-800/50 overflow-hidden transition-colors hover:border-slate-700"
              >
                <button
                  onClick={() => toggle(index)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-sm font-medium text-slate-200">
                    {item.question}
                  </span>
                  <svg
                    className={`w-5 h-5 text-slate-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <div
                  className={`grid transition-all duration-200 ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm leading-relaxed text-slate-400">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
