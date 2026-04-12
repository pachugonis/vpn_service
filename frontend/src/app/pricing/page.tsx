"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Plan } from "@/lib/api";

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPlans().then(setPlans).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading plans...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen px-4 py-16">
      <h1 className="text-4xl font-bold text-center mb-12">Choose Your Plan</h1>
      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="p-8 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col"
          >
            <h2 className="text-2xl font-bold mb-2">{plan.name}</h2>
            <p className="text-gray-500 mb-4">
              {plan.duration_days} days
              {plan.traffic_gb ? ` / ${plan.traffic_gb} GB` : " / Unlimited"}
            </p>
            <div className="mb-6">
              <span className="text-3xl font-bold">{plan.price_rub} RUB</span>
              <span className="text-gray-500 ml-2">/ ${plan.price_usd}</span>
            </div>
            <Link
              href={`/auth?redirect=/payment&plan=${plan.id}`}
              className="mt-auto px-6 py-3 bg-blue-600 text-white rounded-lg text-center font-medium hover:bg-blue-700 transition"
            >
              Get Started
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
