"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminPlan,
  AdminServer,
  AdminUser,
  api,
} from "@/lib/api";
import Navbar from "@/components/Navbar";

type Tab = "servers" | "plans" | "users" | "settings";

const COUNTRIES: { code: string; name: string; flag: string }[] = [
  { code: "de", name: "Германия", flag: "🇩🇪" },
  { code: "nl", name: "Нидерланды", flag: "🇳🇱" },
  { code: "fi", name: "Финляндия", flag: "🇫🇮" },
  { code: "fr", name: "Франция", flag: "🇫🇷" },
  { code: "gb", name: "Великобритания", flag: "🇬🇧" },
  { code: "us", name: "США", flag: "🇺🇸" },
  { code: "ca", name: "Канада", flag: "🇨🇦" },
  { code: "se", name: "Швеция", flag: "🇸🇪" },
  { code: "no", name: "Норвегия", flag: "🇳🇴" },
  { code: "ch", name: "Швейцария", flag: "🇨🇭" },
  { code: "at", name: "Австрия", flag: "🇦🇹" },
  { code: "pl", name: "Польша", flag: "🇵🇱" },
  { code: "lv", name: "Латвия", flag: "🇱🇻" },
  { code: "lt", name: "Литва", flag: "🇱🇹" },
  { code: "ee", name: "Эстония", flag: "🇪🇪" },
  { code: "es", name: "Испания", flag: "🇪🇸" },
  { code: "it", name: "Италия", flag: "🇮🇹" },
  { code: "tr", name: "Турция", flag: "🇹🇷" },
  { code: "jp", name: "Япония", flag: "🇯🇵" },
  { code: "sg", name: "Сингапур", flag: "🇸🇬" },
  { code: "hk", name: "Гонконг", flag: "🇭🇰" },
  { code: "kz", name: "Казахстан", flag: "🇰🇿" },
  { code: "ae", name: "ОАЭ", flag: "🇦🇪" },
];

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("servers");
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    api
      .me()
      .then((u) => {
        if (!u.is_admin) {
          router.replace("/dashboard");
        } else {
          setAllowed(true);
        }
      })
      .catch(() => router.replace("/auth/login"));
  }, [router]);

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-void-950 bg-grid">
        <div className="w-5 h-5 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-grid">
      <Navbar />
      <div className="pt-24 pb-16 px-4 sm:px-6 max-w-6xl mx-auto">
        <h1 className="font-display font-bold text-2xl md:text-3xl text-white mb-6">
          Админка
        </h1>

        <div className="flex flex-wrap gap-2 mb-6">
          {(["servers", "plans", "users", "settings"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === t
                  ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40"
                  : "bg-void-700/50 text-slate-400 border border-white/5 hover:text-white"
              }`}
            >
              {t === "servers"
                ? "Серверы"
                : t === "plans"
                ? "Планы"
                : t === "users"
                ? "Пользователи"
                : "Настройки"}
            </button>
          ))}
        </div>

        {tab === "servers" && <ServersTab />}
        {tab === "plans" && <PlansTab />}
        {tab === "users" && <UsersTab />}
        {tab === "settings" && <SettingsTab />}
      </div>
    </main>
  );
}

/* ---------------- Servers ---------------- */

function ServersTab() {
  const [items, setItems] = useState<AdminServer[]>([]);
  const [editing, setEditing] = useState<Partial<AdminServer> | null>(null);

  const load = () => api.admin.listServers().then(setItems).catch(console.error);
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!editing) return;
    try {
      if (editing.id) {
        await api.admin.updateServer(editing.id, editing);
      } else {
        await api.admin.createServer(editing as AdminServer & { password: string });
      }
      setEditing(null);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Удалить сервер?")) return;
    try {
      await api.admin.deleteServer(id);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div>
      <button
        onClick={() =>
          setEditing({
            name: "",
            location: "",
            flag_emoji: "",
            url: "",
            username: "",
            password: "",
            inbound_id: 1,
            is_active: true,
          })
        }
        className="btn-neon !py-2 !px-4 text-sm mb-4"
      >
        + Новый сервер
      </button>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500 border-b border-white/5">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Название</th>
              <th className="p-3">Локация</th>
              <th className="p-3">URL</th>
              <th className="p-3">Inbound</th>
              <th className="p-3">Статус</th>
              <th className="p-3">Загрузка</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-b border-white/5 text-slate-300">
                <td className="p-3">{s.id}</td>
                <td className="p-3">
                  {s.flag_emoji} {s.name}
                </td>
                <td className="p-3">{s.location}</td>
                <td className="p-3 text-xs text-slate-500">{s.url}</td>
                <td className="p-3">{s.inbound_id}</td>
                <td className="p-3">
                  {s.is_active ? (
                    <span className="text-neon-green">активен</span>
                  ) : (
                    <span className="text-slate-500">выкл</span>
                  )}
                </td>
                <td className="p-3">{s.load_pct}%</td>
                <td className="p-3 text-right space-x-2">
                  <button
                    onClick={() => setEditing(s)}
                    className="text-neon-cyan hover:underline text-xs"
                  >
                    править
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    className="text-red-400 hover:underline text-xs"
                  >
                    удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal onClose={() => setEditing(null)} onSave={save} title={editing.id ? "Редактировать сервер" : "Новый сервер"}>
          <Input label="Название" value={editing.name || ""} onChange={(v) => setEditing({ ...editing, name: v })} />
          <Select
            label="Локация"
            value={editing.location || ""}
            onChange={(v) => {
              const c = COUNTRIES.find((x) => x.code === v);
              setEditing({ ...editing, location: v, flag_emoji: c?.flag || editing.flag_emoji || "" });
            }}
            options={[
              { value: "", label: "— выберите страну —" },
              ...COUNTRIES.map((c) => ({ value: c.code, label: `${c.flag} ${c.name}` })),
            ]}
          />
          <Input label="Флаг" value={editing.flag_emoji || ""} onChange={(v) => setEditing({ ...editing, flag_emoji: v })} />
          <Input label="URL" value={editing.url || ""} onChange={(v) => setEditing({ ...editing, url: v })} />
          <Input
            label="Sub URL (напр. https://host:2096)"
            value={editing.sub_url || ""}
            onChange={(v) => setEditing({ ...editing, sub_url: v })}
          />
          <Input label="Username" value={editing.username || ""} onChange={(v) => setEditing({ ...editing, username: v })} />
          <Input
            label="Password"
            type="password"
            value={editing.password || ""}
            onChange={(v) => setEditing({ ...editing, password: v })}
          />
          <Input
            label="Inbound ID"
            type="number"
            value={String(editing.inbound_id ?? "")}
            onChange={(v) => setEditing({ ...editing, inbound_id: Number(v) })}
          />
          <Checkbox
            label="Активен"
            value={!!editing.is_active}
            onChange={(v) => setEditing({ ...editing, is_active: v })}
          />
          <TestConnectionRow server={editing} />
        </Modal>
      )}
    </div>
  );
}

function TestConnectionRow({ server }: { server: Partial<AdminServer> }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null
  );

  const run = async () => {
    if (!server.url || !server.username || !server.password) {
      setResult({
        ok: false,
        message: "Заполните URL, username и password",
      });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const r = await api.admin.testServerConnection({
        url: server.url,
        username: server.username,
        password: server.password,
        inbound_id: Number(server.inbound_id ?? 1),
      });
      setResult(r);
    } catch (e: any) {
      setResult({ ok: false, message: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-2 border-t border-white/5 mt-2">
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/40 hover:bg-neon-cyan/25 disabled:opacity-50"
      >
        {loading ? "Проверка..." : "Проверить соединение"}
      </button>
      {result && (
        <div
          className={`mt-2 text-xs ${
            result.ok ? "text-neon-green" : "text-red-400"
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}

/* ---------------- Plans ---------------- */

function PlansTab() {
  const [items, setItems] = useState<AdminPlan[]>([]);
  const [editing, setEditing] = useState<Partial<AdminPlan> | null>(null);

  const load = () => api.admin.listPlans().then(setItems).catch(console.error);
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!editing) return;
    try {
      if (editing.id) {
        await api.admin.updatePlan(editing.id, editing);
      } else {
        await api.admin.createPlan(editing);
      }
      setEditing(null);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Удалить план?")) return;
    await api.admin.deletePlan(id);
    load();
  };

  return (
    <div>
      <button
        onClick={() =>
          setEditing({
            name: "",
            duration_days: 30,
            price_rub: 0,
            price_usd: 0,
            traffic_gb: null,
            is_active: true,
          })
        }
        className="btn-neon !py-2 !px-4 text-sm mb-4"
      >
        + Новый план
      </button>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500 border-b border-white/5">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Название</th>
              <th className="p-3">Дней</th>
              <th className="p-3">₽</th>
              <th className="p-3">$</th>
              <th className="p-3">Трафик</th>
              <th className="p-3">Статус</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-b border-white/5 text-slate-300">
                <td className="p-3">{p.id}</td>
                <td className="p-3">{p.name}</td>
                <td className="p-3">{p.duration_days}</td>
                <td className="p-3">{p.price_rub}</td>
                <td className="p-3">{p.price_usd}</td>
                <td className="p-3">{p.traffic_gb ?? "∞"}</td>
                <td className="p-3">
                  {p.is_active ? (
                    <span className="text-neon-green">активен</span>
                  ) : (
                    <span className="text-slate-500">выкл</span>
                  )}
                </td>
                <td className="p-3 text-right space-x-2">
                  <button
                    onClick={() => setEditing(p)}
                    className="text-neon-cyan hover:underline text-xs"
                  >
                    править
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="text-red-400 hover:underline text-xs"
                  >
                    удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal onClose={() => setEditing(null)} onSave={save} title={editing.id ? "Редактировать план" : "Новый план"}>
          <Input label="Название" value={editing.name || ""} onChange={(v) => setEditing({ ...editing, name: v })} />
          <Input
            label="Длительность (дней)"
            type="number"
            value={String(editing.duration_days ?? "")}
            onChange={(v) => setEditing({ ...editing, duration_days: Number(v) })}
          />
          <Input
            label="Цена ₽"
            type="number"
            value={String(editing.price_rub ?? "")}
            onChange={(v) => setEditing({ ...editing, price_rub: Number(v) })}
          />
          <Input
            label="Цена $"
            type="number"
            value={String(editing.price_usd ?? "")}
            onChange={(v) => setEditing({ ...editing, price_usd: Number(v) })}
          />
          <Input
            label="Трафик (ГБ, пусто = безлимит)"
            type="number"
            value={editing.traffic_gb == null ? "" : String(editing.traffic_gb)}
            onChange={(v) =>
              setEditing({ ...editing, traffic_gb: v === "" ? null : Number(v) })
            }
          />
          <Checkbox
            label="Активен"
            value={!!editing.is_active}
            onChange={(v) => setEditing({ ...editing, is_active: v })}
          />
        </Modal>
      )}
    </div>
  );
}

/* ---------------- Users ---------------- */

function UsersTab() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [assigning, setAssigning] = useState<AdminUser | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<number | "">("");
  const [assignBusy, setAssignBusy] = useState(false);

  const load = () => api.admin.listUsers().then(setItems).catch(console.error);
  useEffect(() => {
    load();
    api.admin.listPlans().then(setPlans).catch(console.error);
  }, []);

  const openAssign = (u: AdminUser) => {
    setAssigning(u);
    setSelectedPlan("");
  };

  const confirmAssign = async () => {
    if (!assigning || !selectedPlan) return;
    setAssignBusy(true);
    try {
      await api.admin.assignPlan(assigning.id, Number(selectedPlan));
      setAssigning(null);
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setAssignBusy(false);
    }
  };

  const toggleActive = async (u: AdminUser) => {
    try {
      await api.admin.updateUser(u.id, { is_active: !u.is_active });
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Удалить пользователя?")) return;
    try {
      await api.admin.deleteUser(id);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div>
    <div className="glass-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-slate-500 border-b border-white/5">
          <tr>
            <th className="p-3">ID</th>
            <th className="p-3">Email</th>
            <th className="p-3">Создан</th>
            <th className="p-3">Активен</th>
            <th className="p-3">Роль</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((u) => (
            <tr key={u.id} className="border-b border-white/5 text-slate-300">
              <td className="p-3">{u.id}</td>
              <td className="p-3">{u.email}</td>
              <td className="p-3 text-xs text-slate-500">
                {new Date(u.created_at).toLocaleDateString("ru-RU")}
              </td>
              <td className="p-3">
                <button
                  onClick={() => toggleActive(u)}
                  className={u.is_active ? "text-neon-green" : "text-slate-500"}
                >
                  {u.is_active ? "да" : "нет"}
                </button>
              </td>
              <td className="p-3">
                {u.is_admin ? (
                  <span className="text-neon-cyan">admin</span>
                ) : (
                  <span className="text-slate-500">user</span>
                )}
              </td>
              <td className="p-3 text-right space-x-2">
                <button
                  onClick={() => openAssign(u)}
                  className="text-neon-cyan hover:underline text-xs"
                >
                  выдать план
                </button>
                <button
                  onClick={() => remove(u.id)}
                  className="text-red-400 hover:underline text-xs"
                >
                  удалить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {assigning && (
      <Modal
        title={`Выдать план — ${assigning.email}`}
        onClose={() => setAssigning(null)}
        onSave={confirmAssign}
      >
        <p className="text-xs text-slate-500">
          План будет активирован вручную, без оплаты. Если у пользователя уже
          есть активная подписка, её срок будет продлён.
        </p>
        <Select
          label="План"
          value={selectedPlan === "" ? "" : String(selectedPlan)}
          onChange={(v) => setSelectedPlan(v === "" ? "" : Number(v))}
          options={[
            { value: "", label: "— выберите план —" },
            ...plans
              .filter((p) => p.is_active)
              .map((p) => ({
                value: String(p.id),
                label: `${p.name} — ${p.duration_days} дн.`,
              })),
          ]}
        />
        {assignBusy && (
          <div className="text-xs text-slate-500">Активация...</div>
        )}
      </Modal>
    )}
    </div>
  );
}

/* ---------------- Settings ---------------- */

function SettingsTab() {
  const [maintenance, setMaintenance] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.admin
      .getSettings()
      .then((s) => setMaintenance(s.maintenance_mode))
      .catch(console.error);
  }, []);

  const toggle = async () => {
    if (maintenance === null) return;
    setSaving(true);
    try {
      const next = !maintenance;
      const s = await api.admin.updateSettings({ maintenance_mode: next });
      setMaintenance(s.maintenance_mode);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (maintenance === null) {
    return <div className="text-slate-500 text-sm">Загрузка...</div>;
  }

  return (
    <div className="glass-card p-6 max-w-2xl">
      <h2 className="font-display font-semibold text-white text-lg mb-1">
        Режим обслуживания
      </h2>
      <p className="text-sm text-slate-500 mb-5">
        Когда включён, сайт недоступен для всех пользователей кроме
        администраторов. Администраторы могут войти через{" "}
        <code className="text-neon-cyan">/admin-login</code>.
      </p>

      <div className="flex items-center justify-between p-4 rounded-lg bg-void-700/40 border border-white/5">
        <div>
          <div className="text-white text-sm font-medium">
            Статус:{" "}
            {maintenance ? (
              <span className="text-amber-400">включён</span>
            ) : (
              <span className="text-neon-green">выключен</span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {maintenance
              ? "Сайт сейчас на обслуживании"
              : "Сайт работает в штатном режиме"}
          </div>
        </div>
        <button
          onClick={toggle}
          disabled={saving}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${
            maintenance
              ? "bg-neon-green/15 text-neon-green border border-neon-green/40 hover:bg-neon-green/25"
              : "bg-amber-500/15 text-amber-400 border border-amber-500/40 hover:bg-amber-500/25"
          }`}
        >
          {saving ? "..." : maintenance ? "Выключить" : "Включить"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- UI primitives ---------------- */

function Modal({
  title,
  children,
  onClose,
  onSave,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="glass-card p-6 w-full max-w-lg">
        <h3 className="font-display font-semibold text-white text-lg mb-4">{title}</h3>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">{children}</div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white"
          >
            Отмена
          </button>
          <button onClick={onSave} className="btn-neon !py-2 !px-4 text-sm">
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-slate-500 block mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-void-700/50 border border-white/10 text-white text-sm focus:outline-none focus:border-neon-cyan/50"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-xs text-slate-500 block mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-void-700/50 border border-white/10 text-white text-sm focus:outline-none focus:border-neon-cyan/50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-void-900">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Checkbox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-neon-cyan"
      />
      {label}
    </label>
  );
}
