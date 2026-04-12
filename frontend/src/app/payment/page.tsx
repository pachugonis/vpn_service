"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

export default function PaymentPage() {
  const params = useSearchParams();
  const planId = Number(params.get("plan") || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePay = async (method: "card" | "sbp" | "btc") => {
    if (!planId) {
      setError("No plan selected");
      return;
    }
    setLoading(true);
    setError("");
    try {
      let result;
      if (method === "btc") {
        result = await api.createBtcPayment(planId);
      } else {
        const paymentMethod = method === "sbp" ? 2 : 10;
        result = await api.createPlategaPayment(planId, paymentMethod);
      }
      window.location.href = result.redirect_url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md p-8 rounded-xl border border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Choose Payment Method
        </h1>

        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

        <div className="space-y-3">
          <button
            onClick={() => handlePay("card")}
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            Bank Card (RUB)
          </button>
          <button
            onClick={() => handlePay("sbp")}
            disabled={loading}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
          >
            SBP (QR)
          </button>
          <button
            onClick={() => handlePay("btc")}
            disabled={loading}
            className="w-full py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition disabled:opacity-50"
          >
            Bitcoin / Lightning
          </button>
        </div>
      </div>
    </main>
  );
}
