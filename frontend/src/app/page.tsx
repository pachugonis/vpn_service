import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        <h1 className="text-5xl font-bold mb-6">
          Fast &amp; Secure VPN
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mb-10">
          Multiple server locations, unlimited bandwidth, easy setup.
          Connect in seconds with any VPN client.
        </p>
        <div className="flex gap-4">
          <Link
            href="/pricing"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            View Plans
          </Link>
          <Link
            href="/auth"
            className="px-8 py-3 border border-gray-300 dark:border-gray-700 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 pb-20 grid md:grid-cols-3 gap-8">
        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold mb-2">Multiple Locations</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Servers in Germany, Netherlands, Finland and more. Pick the closest one for best speed.
          </p>
        </div>
        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold mb-2">Easy Payment</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Pay with Russian bank cards, SBP or Bitcoin. Instant activation after payment.
          </p>
        </div>
        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold mb-2">Modern Protocol</h3>
          <p className="text-gray-600 dark:text-gray-400">
            VLESS + XTLS-Reality for maximum speed and stealth. Works with any Xray-compatible client.
          </p>
        </div>
      </section>
    </main>
  );
}
