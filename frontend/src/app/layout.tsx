import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "КАКОВО?! — Безопасный VPN без границ",
  description:
    "Быстрый и приватный VPN-сервис с серверами в Европе. VLESS + XTLS-Reality. Оплата картами РФ и биткоином.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#031a12",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;500;600;700;800;900&family=Manrope:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="noise-overlay bg-void-950 min-h-screen overflow-x-hidden">
        {/* Ambient glow blobs */}
        <div className="radial-glow -top-[400px] left-1/2 -translate-x-1/2 opacity-60" />
        <div className="radial-glow top-[60%] -right-[300px] opacity-30" />
        <div className="radial-glow top-[80%] -left-[300px] opacity-20" style={{ background: "radial-gradient(circle, rgba(45,212,168,0.06) 0%, transparent 70%)" }} />

        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
