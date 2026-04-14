"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Status = "idle" | "sending" | "ok" | "error";

export default function SupportPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("Общий вопрос");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, topic, message }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не удалось отправить сообщение");
      }
      setStatus("ok");
      setName("");
      setEmail("");
      setTopic("Общий вопрос");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Ошибка отправки");
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-void-900 text-slate-200">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-16 w-full">
        <h1 className="font-display text-3xl sm:text-4xl font-bold mb-4">
          <span className="text-gradient-cyan">Поддержка</span>
        </h1>
        <p className="text-sm text-slate-400 mb-10 leading-relaxed">
          Напишите нам — отвечаем в течение нескольких часов. Сообщение попадёт
          напрямую в телеграм службы поддержки.
        </p>

        <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-8 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Имя
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-void-700 border border-white/5 text-sm text-white focus:border-neon-cyan/40 focus:outline-none transition-colors"
              placeholder="Как к вам обращаться"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-void-700 border border-white/5 text-sm text-white focus:border-neon-cyan/40 focus:outline-none transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Тема
            </label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-void-700 border border-white/5 text-sm text-white focus:border-neon-cyan/40 focus:outline-none transition-colors"
            >
              <option>Общий вопрос</option>
              <option>Проблема с подключением</option>
              <option>Оплата и подписка</option>
              <option>Настройка клиента</option>
              <option>Другое</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Сообщение
            </label>
            <textarea
              required
              rows={6}
              minLength={10}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-void-700 border border-white/5 text-sm text-white focus:border-neon-cyan/40 focus:outline-none transition-colors resize-y"
              placeholder="Опишите вашу проблему подробно"
            />
          </div>

          <button
            type="submit"
            disabled={status === "sending"}
            className="btn-solid w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === "sending" ? "Отправка..." : "Отправить"}
          </button>

          {status === "ok" && (
            <p className="text-sm text-neon-green text-center">
              Сообщение отправлено. Мы скоро свяжемся с вами.
            </p>
          )}
          {status === "error" && (
            <p className="text-sm text-red-400 text-center">{errorMsg}</p>
          )}
        </form>
      </main>
      <Footer />
    </div>
  );
}
