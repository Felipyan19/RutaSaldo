"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Route,
  Settings,
  Tags,
  WalletCards,
  X,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  Account,
  accountBalance,
  FinanceState,
  formatCOP,
  totals,
  Transaction,
} from "@/lib/finance";
import { loadFinanceState, resetFinanceState, saveFinanceState } from "@/lib/storage";
import { seedState } from "@/lib/finance";
import { AccountForm, TransactionForm } from "./forms";

type View = "dashboard" | "accounts" | "transactions" | "categories";

const navigation = [
  { id: "dashboard" as const, label: "Resumen", icon: LayoutDashboard },
  { id: "accounts" as const, label: "Cuentas", icon: WalletCards },
  { id: "transactions" as const, label: "Movimientos", icon: CircleDollarSign },
  { id: "categories" as const, label: "Categorías", icon: Tags },
];

function Sidebar({
  workspaceName,
  view,
  onViewChange,
  onSignOut,
}: {
  workspaceName: string;
  view: View;
  onViewChange: (view: View) => void;
  onSignOut: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3 px-2">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#b7f34b] text-[#17231e]">
          <Route size={22} />
        </span>
        <span className="text-lg font-semibold tracking-tight">RutaSaldo</span>
      </div>
      <div className="mt-8 rounded-xl border border-white/10 bg-white/[.04] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#819087]">Workspace</p>
        <button className="mt-2 flex w-full items-center justify-between text-left text-sm font-medium">
          {workspaceName}
          <ChevronDown size={15} />
        </button>
      </div>
      <nav className="mt-7 space-y-1.5">
        {navigation.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
              view === item.id ? "bg-[#b7f34b] text-[#17231e]" : "text-[#aab7af] hover:bg-white/[.06] hover:text-white"
            }`}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="mt-auto space-y-1.5">
        <button className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-[#aab7af] hover:bg-white/[.06]">
          <Settings size={18} /> Configuración
        </button>
        <button onClick={onSignOut} className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-[#aab7af] hover:bg-white/[.06]">
          <LogOut size={18} /> Cerrar sesión
        </button>
        <div className="mt-4 flex items-center gap-3 border-t border-white/10 px-2 pt-5">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-[#d4e5d9] text-sm font-semibold text-[#21352b]">FC</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">Feli Castaño</p>
            <p className="truncate text-xs text-[#839188]">demo@rutasaldo.app</p>
          </div>
        </div>
      </div>
    </>
  );
}

export function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const [state, setState] = useState<FinanceState | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [modal, setModal] = useState<"transaction" | "account" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Client-only hydration keeps browser persistence out of server rendering.
    loadFinanceState()
      .then(setState)
      .catch(() => {
        setState(seedState);
        setError("No se pudo conectar con la base de datos. Revisa DATABASE_URL en el entorno.");
      });
  }, []);

  async function update(next: FinanceState) {
    setState(next);
    try {
      await saveFinanceState(next);
      setError(null);
    } catch {
      setError("El cambio se mostró localmente, pero no pudo guardarse en Neon.");
    }
  }

  if (!state) return <main className="min-h-screen bg-[#f4f5f0]" />;

  function addTransaction(transaction: Transaction) {
    void update({ ...state!, transactions: [transaction, ...state!.transactions] });
    setModal(null);
  }

  function addAccount(account: Account) {
    void update({ ...state!, accounts: [...state!.accounts, account] });
    setModal(null);
  }

  return (
    <div className="min-h-screen bg-[#f4f5f0] text-[#18241e]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[#17231e] p-5 text-white lg:flex">
        <Sidebar workspaceName={state.workspaceName} view={view} onViewChange={(next) => { setView(next); setMobileMenu(false); }} onSignOut={onSignOut} />
      </aside>
      {mobileMenu && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden">
          <aside className="flex h-full w-72 flex-col bg-[#17231e] p-5 text-white">
            <button onClick={() => setMobileMenu(false)} className="absolute right-4 top-4 p-2"><X /></button>
            <Sidebar workspaceName={state.workspaceName} view={view} onViewChange={(next) => { setView(next); setMobileMenu(false); }} onSignOut={onSignOut} />
          </aside>
        </div>
      )}

      <main className="lg:ml-64">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-[#e0e4dd] bg-[#f4f5f0]/90 px-5 backdrop-blur-xl md:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenu(true)} className="p-2 lg:hidden"><Menu /></button>
            <div>
              <h1 className="text-xl font-semibold tracking-[-0.025em]">
                {navigation.find((item) => item.id === view)?.label}
              </h1>
              <p className="hidden text-xs text-[#7a857e] sm:block">Miércoles, 29 de julio</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#dce1da] bg-white">
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#e76a58]" />
            </button>
            <button onClick={() => setModal("transaction")} className="flex h-10 items-center gap-2 rounded-xl bg-[#17231e] px-4 text-sm font-semibold text-white">
              <Plus size={17} /> <span className="hidden sm:inline">Movimiento</span>
            </button>
          </div>
        </header>

        <div className="p-5 md:p-8 lg:p-10">
          {error && (
            <div className="mb-5 rounded-2xl border border-[#e8c9bf] bg-[#fff4ef] px-4 py-3 text-sm text-[#914f3d]">
              {error}
            </div>
          )}
          {view === "dashboard" && <Overview state={state} onViewChange={setView} />}
          {view === "accounts" && <Accounts state={state} onAdd={() => setModal("account")} />}
          {view === "transactions" && <Transactions state={state} />}
          {view === "categories" && <Categories state={state} />}
          <div className="mt-10 flex items-center justify-between border-t border-[#dde2db] pt-5 text-xs text-[#87918b]">
            <span>RutaSaldo · Fase 1</span>
            <button
              onClick={() => {
                void resetFinanceState().then(setState).catch(() => setError("No se pudieron restaurar los datos demo."));
              }}
              className="hover:text-[#18241e]"
            >
              Restaurar datos demo
            </button>
          </div>
        </div>
      </main>
      {modal === "transaction" && (
        <TransactionForm accounts={state.accounts} categories={state.categories} onSave={addTransaction} onClose={() => setModal(null)} />
      )}
      {modal === "account" && <AccountForm onSave={addAccount} onClose={() => setModal(null)} />}
    </div>
  );
}

function Overview({ state, onViewChange }: { state: FinanceState; onViewChange: (view: View) => void }) {
  const summary = totals(state);
  const chartData = useMemo(
    () =>
      state.categories
        .filter((category) => category.id !== "salary")
        .map((category) => ({
          name: category.name,
          color: category.color,
          value: state.transactions
            .filter((item) => item.kind === "expense" && item.categoryId === category.id)
            .reduce((sum, item) => sum + item.amount, 0),
        }))
        .filter((item) => item.value > 0),
    [state],
  );
  const variation = summary.income ? Math.round(((summary.income - summary.expenses) / summary.income) * 100) : 0;

  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-[#6f7a73]">Tu panorama financiero</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Hola, Feli 👋</h2>
        </div>
        <span className="rounded-full bg-[#e5eee8] px-4 py-2 text-xs font-medium text-[#466454]">Julio 2026</span>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Saldo total" value={formatCOP(summary.balance)} note={`${state.accounts.length} cuentas activas`} tone="dark" />
        <Metric label="Ingresos del mes" value={formatCOP(summary.income)} note="Un ingreso registrado" tone="green" />
        <Metric label="Gastos del mes" value={formatCOP(summary.expenses)} note={`${variation}% disponible del ingreso`} tone="light" />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_.9fr]">
        <div className="rounded-3xl border border-[#e0e4dd] bg-white p-5 md:p-7">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Tus cuentas</h3>
              <p className="mt-1 text-xs text-[#7b867f]">Saldos actualizados con cada movimiento</p>
            </div>
            <button onClick={() => onViewChange("accounts")} className="text-xs font-semibold text-[#4f6c5c]">Ver todas</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {state.accounts.slice(0, 4).map((account) => (
              <div key={account.id} className="group rounded-2xl border border-[#e7eae5] p-4 transition hover:border-[#bec9c1]">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl text-white" style={{ backgroundColor: account.color }}>
                    {account.kind === "cash" ? <CircleDollarSign size={19} /> : <CreditCard size={19} />}
                  </span>
                  <MoreHorizontal size={18} className="text-[#9da59f]" />
                </div>
                <p className="mt-4 text-xs text-[#768179]">{account.institution} · {account.name}</p>
                <p className="mt-1 text-lg font-semibold">{formatCOP(accountBalance(account, state.transactions))}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[#e0e4dd] bg-white p-5 md:p-7">
          <h3 className="font-semibold">Gastos por categoría</h3>
          <p className="mt-1 text-xs text-[#7b867f]">Distribución del mes actual</p>
          <div className="relative mx-auto mt-3 h-48 max-w-xs">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" innerRadius={56} outerRadius={78} paddingAngle={4} stroke="none">
                  {chartData.map((item) => <Cell key={item.name} fill={item.color} />)}
                </Pie>
                <Tooltip formatter={(value) => formatCOP(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div><p className="text-[10px] text-[#859088]">Total</p><p className="text-sm font-semibold">{formatCOP(summary.expenses, true)}</p></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate text-[#68736c]">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-[#e0e4dd] bg-white p-5 md:p-7">
        <div className="mb-5 flex items-center justify-between">
          <div><h3 className="font-semibold">Movimientos recientes</h3><p className="mt-1 text-xs text-[#7b867f]">Lo último que pasó con tu dinero</p></div>
          <button onClick={() => onViewChange("transactions")} className="text-xs font-semibold text-[#4f6c5c]">Ver todos</button>
        </div>
        <TransactionList state={state} limit={5} />
      </section>
    </>
  );
}

function Metric({ label, value, note, tone }: { label: string; value: string; note: string; tone: "dark" | "green" | "light" }) {
  const styles = {
    dark: "bg-[#17231e] text-white border-[#17231e]",
    green: "bg-[#dcebe1] text-[#18241e] border-[#d1e2d7]",
    light: "bg-white text-[#18241e] border-[#e0e4dd]",
  };
  return (
    <div className={`rounded-3xl border p-5 md:p-6 ${styles[tone]}`}>
      <p className={`text-xs ${tone === "dark" ? "text-[#9eaca4]" : "text-[#66736b]"}`}>{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.035em]">{value}</p>
      <p className={`mt-5 text-[11px] ${tone === "dark" ? "text-[#8d9c93]" : "text-[#758078]"}`}>{note}</p>
    </div>
  );
}

function Accounts({ state, onAdd }: { state: FinanceState; onAdd: () => void }) {
  return (
    <section>
      <div className="mb-7 flex items-center justify-between">
        <div><h2 className="text-2xl font-semibold tracking-tight">Todas tus cuentas</h2><p className="mt-1 text-sm text-[#768179]">Bancos, billeteras y efectivo en un solo lugar.</p></div>
        <button onClick={onAdd} className="flex h-10 items-center gap-2 rounded-xl border border-[#ccd4cd] bg-white px-4 text-sm font-semibold"><Plus size={16} /> Agregar</button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {state.accounts.map((account) => (
          <div key={account.id} className="rounded-3xl border border-[#e0e4dd] bg-white p-6">
            <div className="flex items-start justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-2xl text-white" style={{ backgroundColor: account.color }}><CreditCard size={21} /></span>
              <span className="rounded-full bg-[#eef1ec] px-3 py-1 text-[10px] uppercase tracking-wide text-[#6f7a73]">{account.kind}</span>
            </div>
            <p className="mt-7 text-sm font-medium">{account.institution}</p>
            <p className="text-xs text-[#87918b]">{account.name}</p>
            <p className="mt-4 text-2xl font-semibold tracking-tight">{formatCOP(accountBalance(account, state.transactions))}</p>
            <p className="mt-1 text-xs text-[#89938d]">Saldo disponible</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Transactions({ state }: { state: FinanceState }) {
  return (
    <section className="rounded-3xl border border-[#e0e4dd] bg-white p-5 md:p-7">
      <div className="mb-6"><h2 className="text-2xl font-semibold tracking-tight">Historial</h2><p className="mt-1 text-sm text-[#768179]">{state.transactions.length} movimientos registrados.</p></div>
      <TransactionList state={state} />
    </section>
  );
}

function TransactionList({ state, limit }: { state: FinanceState; limit?: number }) {
  const items = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
  return (
    <div className="divide-y divide-[#edf0eb]">
      {items.map((transaction) => {
        const category = state.categories.find((item) => item.id === transaction.categoryId);
        const account = state.accounts.find((item) => item.id === transaction.accountId);
        const income = transaction.kind === "income";
        return (
          <div key={transaction.id} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${income ? "bg-[#e0eee5] text-[#3f795e]" : "bg-[#f2e9df] text-[#a56339]"}`}>
              {income ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{transaction.description}</p>
              <p className="mt-0.5 truncate text-xs text-[#87918b]">{category?.name} · {account?.institution}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${income ? "text-[#3f795e]" : ""}`}>{income ? "+" : "−"}{formatCOP(transaction.amount)}</p>
              <p className="mt-0.5 text-[10px] text-[#929b95]">{new Date(`${transaction.date}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Categories({ state }: { state: FinanceState }) {
  return (
    <section>
      <div className="mb-7"><h2 className="text-2xl font-semibold tracking-tight">Categorías</h2><p className="mt-1 text-sm text-[#768179]">Organiza y entiende en qué se mueve tu dinero.</p></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {state.categories.map((category) => {
          const count = state.transactions.filter((item) => item.categoryId === category.id).length;
          return (
            <div key={category.id} className="flex items-center gap-4 rounded-2xl border border-[#e0e4dd] bg-white p-5">
              <span className="grid h-11 w-11 place-items-center rounded-xl text-lg text-white" style={{ backgroundColor: category.color }}>{category.icon}</span>
              <div><p className="font-medium">{category.name}</p><p className="mt-1 text-xs text-[#87918b]">{count} movimientos</p></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
