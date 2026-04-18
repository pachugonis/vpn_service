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

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
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
  vpn_uuid: string;
}

export interface ServerInfo {
  id: number;
  name: string;
  location: string;
  flag_emoji: string | null;
  load_pct: number;
  cpu_usage?: number;
  mem_usage?: number;
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
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth-change"));
    }
    return data;
  },

  logout: () => {
    localStorage.removeItem("token");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth-change"));
    }
  },

  me: () =>
    request<{ id: number; email: string; is_active: boolean; is_admin: boolean }>(
      "/auth/me"
    ),

  getPlans: () => request<Plan[]>("/subscriptions/plans"),

  getSubscription: () => request<Subscription | null>("/subscriptions/me"),

  getConfigs: () => request<ServerConfig[]>("/subscriptions/configs"),

  getSubUrl: () => request<{ sub_url: string }>("/subscriptions/sub-url"),

  getServers: () => request<ServerInfo[]>("/servers/"),

  getPublicServers: () => request<ServerInfo[]>("/servers/public"),

  getPublicSettings: () =>
    request<{ maintenance_mode: boolean }>("/settings"),

  getPaymentMethods: () =>
    request<{ methods: PaymentMethodInfo[] }>("/payments/methods"),

  createPlategaPayment: (planId: number, paymentMethod: number = 10) =>
    request<{ payment_id: string; redirect_url: string }>(
      "/payments/platega/create",
      {
        method: "POST",
        body: JSON.stringify({ plan_id: planId, payment_method: paymentMethod }),
      }
    ),

  createYookassaPayment: (planId: number) =>
    request<{ payment_id: string; redirect_url: string }>(
      "/payments/yookassa/create",
      { method: "POST", body: JSON.stringify({ plan_id: planId }) }
    ),

  createBtcPayment: (planId: number) =>
    request<{ payment_id: string; redirect_url: string }>(
      "/payments/btcpay/create",
      { method: "POST", body: JSON.stringify({ plan_id: planId }) }
    ),

  admin: {
    listServers: () => request<AdminServer[]>("/admin/servers"),
    createServer: (data: Partial<AdminServer> & { password: string }) =>
      request<AdminServer>("/admin/servers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateServer: (id: number, data: Partial<AdminServer>) =>
      request<AdminServer>(`/admin/servers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    deleteServer: (id: number) =>
      request<void>(`/admin/servers/${id}`, { method: "DELETE" }),
    resyncServer: (id: number) =>
      request<{ total: number; ok: number; errors: { user_id: number; error: string }[] }>(
        `/admin/servers/${id}/resync`,
        { method: "POST" }
      ),
    testServerConnection: (data: {
      url: string;
      username: string;
      password: string;
      inbound_id: number;
    }) =>
      request<{ ok: boolean; message: string }>(
        "/admin/servers/test-connection",
        { method: "POST", body: JSON.stringify(data) }
      ),

    listPlans: () => request<AdminPlan[]>("/admin/plans"),
    createPlan: (data: Partial<AdminPlan>) =>
      request<AdminPlan>("/admin/plans", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updatePlan: (id: number, data: Partial<AdminPlan>) =>
      request<AdminPlan>(`/admin/plans/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    deletePlan: (id: number) =>
      request<void>(`/admin/plans/${id}`, { method: "DELETE" }),

    listUsers: () => request<AdminUser[]>("/admin/users"),
    updateUser: (id: number, data: { is_active?: boolean }) =>
      request<AdminUser>(`/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    deleteUser: (id: number) =>
      request<void>(`/admin/users/${id}`, { method: "DELETE" }),
    assignPlan: (id: number, planId: number) =>
      request<void>(`/admin/users/${id}/assign-plan`, {
        method: "POST",
        body: JSON.stringify({ plan_id: planId }),
      }),

    getSettings: () =>
      request<{ maintenance_mode: boolean }>("/admin/settings"),
    updateSettings: (data: { maintenance_mode: boolean }) =>
      request<{ maintenance_mode: boolean }>("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },
};

export interface PaymentMethodInfo {
  id: "platega" | "yookassa" | "btcpay";
  title: string;
  description: string;
  enabled: boolean;
}

export interface AdminServer {
  id: number;
  name: string;
  location: string;
  flag_emoji: string | null;
  url: string;
  sub_url: string | null;
  username: string;
  password?: string;
  inbound_id: number;
  is_active: boolean;
  load_pct: number;
  online_clients: number;
  cpu_usage: number;
  mem_usage: number;
}

export interface AdminPlan {
  id: number;
  name: string;
  duration_days: number;
  price_rub: number;
  price_usd: number;
  traffic_gb: number | null;
  is_active: boolean;
}

export interface AdminUser {
  id: number;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}
