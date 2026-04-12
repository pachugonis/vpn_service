"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ServerConfig, Subscription } from "@/lib/api";

export default function DashboardPage() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [configs, setConfigs] = useState<ServerConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getSubscription(), api.getConfigs()])
      .then(([s, c]) => {
        setSub(s);
        setConfigs(c);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen px-4 py-16 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {/* Subscription status */}
      <section className="mb-10 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-semibold mb-4">Subscription</h2>
        {sub && sub.is_active ? (
          <div>
            <p>
              <strong>Plan:</strong> {sub.plan.name}
            </p>
            <p>
              <strong>Expires:</strong>{" "}
              {new Date(sub.ends_at).toLocaleDateString()}
            </p>
            <p>
              <strong>Traffic:</strong>{" "}
              {sub.traffic_gb ? `${sub.traffic_gb} GB` : "Unlimited"}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-gray-500 mb-4">No active subscription</p>
            <Link
              href="/pricing"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Buy a Plan
            </Link>
          </div>
        )}
      </section>

      {/* Server configs */}
      {configs.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Your Servers</h2>
          <div className="space-y-4">
            {configs.map((c, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-between"
              >
                <div>
                  <span className="mr-2">{c.flag_emoji}</span>
                  <strong>{c.server_name}</strong>
                  <span className="text-gray-500 ml-2">({c.server_location})</span>
                </div>
                {c.sub_link && (
                  <button
                    onClick={() => navigator.clipboard.writeText(c.sub_link!)}
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition"
                  >
                    Copy Link
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
