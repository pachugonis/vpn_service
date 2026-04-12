import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VPN Shop",
  description: "Fast & secure VPN service",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
