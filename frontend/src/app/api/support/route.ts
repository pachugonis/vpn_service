import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_SUPPORT_CHAT_ID;

  if (!token || !chatId) {
    return NextResponse.json(
      { error: "Сервис поддержки временно недоступен" },
      { status: 500 }
    );
  }

  let body: { name?: string; email?: string; topic?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const topic = (body.topic ?? "").trim();
  const message = (body.message ?? "").trim();

  if (!name || !email || !topic || message.length < 10) {
    return NextResponse.json({ error: "Заполните все поля" }, { status: 400 });
  }
  if (name.length > 100 || email.length > 200 || message.length > 4000) {
    return NextResponse.json({ error: "Слишком длинное сообщение" }, { status: 400 });
  }

  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const text =
    `<b>Новое обращение в поддержку</b>\n\n` +
    `<b>Имя:</b> ${escape(name)}\n` +
    `<b>Email:</b> ${escape(email)}\n` +
    `<b>Тема:</b> ${escape(topic)}\n\n` +
    `<b>Сообщение:</b>\n${escape(message)}`;

  try {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );
    if (!tgRes.ok) {
      return NextResponse.json(
        { error: "Не удалось отправить сообщение" },
        { status: 502 }
      );
    }
  } catch {
    return NextResponse.json({ error: "Ошибка отправки" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
