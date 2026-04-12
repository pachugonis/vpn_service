const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export interface Plan {
  id: number;
  name: string;
  duration_days: number;
  price_rub: number;
  price_usd: number;
  traffic_gb: number | null;
}

export interface Subscription {
  id: number;
  plan: Plan;
  started_at: string;
  ends_at: string;
  is_active: boolean;
  traffic_gb: number | null;
}

export interface ServerConfig {
  server_name: string;
  server_location: string;
  flag_emoji: string | null;
  sub_link: string | null;
}

export interface ServerInfo {
  id: number;
  name: string;
  location: string;
  flag_emoji: string | null;
  load_pct: number;
}

export const api = {
  register: (email: string, password: string) =>
    request<{ id: number; email: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  login: async (email: string, password: string) => {
    const data = await request<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("token", data.access_token);
    return data;
  },

  me: () => request<{ id: number; email: string; is_active: boolean }>("/auth/me"),

  getPlans: () => request<Plan[]>("/subscriptions/plans"),

  getSubscription: () => request<Subscription | null>("/subscriptions/me"),

  getConfigs: () => request<ServerConfig[]>("/subscriptions/configs"),

  getServers: () => request<ServerInfo[]>("/servers/"),

  createPlategaPayment: (planId: number, paymentMethod: number = 10) =>
    request<{ payment_id: string; redirect_url: string }>(
      "/payments/platega/create",
      {
        method: "POST",
        body: JSON.stringify({ plan_id: planId, payment_method: paymentMethod }),
      }
    ),

  createBtcPayment: (planId: number) =>
    request<{ payment_id: string; redirect_url: string }>(
      "/payments/btcpay/create",
      { method: "POST", body: JSON.stringify({ plan_id: planId }) }
    ),
};
