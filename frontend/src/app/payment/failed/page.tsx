import Link from "next/link";

export default function PaymentFailedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">&#10007;</div>
        <h1 className="text-3xl font-bold mb-4">Payment Failed</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Something went wrong with your payment. Please try again or choose a different payment method.
        </p>
        <Link
          href="/pricing"
          className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
        >
          Try Again
        </Link>
      </div>
    </main>
  );
}
