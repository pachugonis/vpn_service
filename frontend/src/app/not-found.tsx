import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "404 — Страница не найдена — КАКОВО?!",
  description: "Запрошенная страница не найдена.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-void-900 text-slate-200">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-16">
        <div className="max-w-xl w-full text-center">
          <div className="font-display text-[120px] sm:text-[180px] leading-none font-black tracking-tight">
            <span className="text-gradient-cyan">4</span>
            <span className="text-white">0</span>
            <span className="text-gradient-cyan">4</span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-4 mb-4">
            КАК<span className="relative">О<span aria-hidden className="absolute -top-3 left-1/2 -translate-x-1/2 text-cyan-400">́</span></span>ГО ХРЕНА?!
          </h1>

          <p className="text-sm sm:text-base text-slate-400 mb-10 leading-relaxed">
            Возможно, страница была удалена, переименована или никогда не существовала.
            Проверьте адрес или вернитесь на главную.
          </p>

          <div className="flex justify-center">
            <Link
              href="/"
              className="px-6 py-3 rounded-xl bg-cyan-500/90 hover:bg-cyan-400 text-void-950 font-semibold text-sm transition-colors"
            >
              На главную
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
