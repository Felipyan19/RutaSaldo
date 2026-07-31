"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRightLeft, Bell, ChevronDown, CircleDollarSign, LayoutDashboard, LogOut, Menu, Plus, Settings, Tags, WalletCards, X } from "lucide-react";
import { useState } from "react";
import { logOut } from "@/app/actions";
import { Account, Transaction, Transfer } from "@/lib/finance";
import { useFinance } from "./finance-provider";
import { AccountForm, TransactionForm, TransferForm } from "@/components/forms";
import { BrandMark } from "@/components/brand-mark";
import { RutaSaldoLoader } from "@/components/rutasaldo-loader";

const navigation = [
  { href: "/resumen", label: "Resumen", icon: LayoutDashboard },
  { href: "/cuentas", label: "Cuentas", icon: WalletCards },
  { href: "/movimientos", label: "Movimientos", icon: CircleDollarSign },
  { href: "/categorias", label: "Categorías", icon: Tags },
  { href: "/configuracion", label: "Configuración", icon: Settings },
] as const;

type User = { name?: string | null; email?: string | null; image?: string | null };
type ModalName = "transaction" | "transfer" | "account" | null;

export function DashboardShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const { state, error, saving, createAccount, createTransaction, createTransfer } = useFinance();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [quickMenu, setQuickMenu] = useState(false);
  const [modal, setModal] = useState<ModalName>(null);
  const current = navigation.find((item) => pathname.startsWith(item.href)) ?? navigation[0];

  function openModal(nextModal: Exclude<ModalName, null>) {
    setQuickMenu(false);
    setModal(nextModal);
  }

  function addTransaction(transaction: Transaction) {
    void createTransaction(transaction);
    setModal(null);
  }

  function addTransfer(transfer: Transfer) {
    void createTransfer(transfer);
    setModal(null);
  }

  function addAccount(account: Account) {
    void createAccount(account);
    setModal(null);
  }

  if (!state) return <RutaSaldoLoader label="Cargando tus registros…" variant="light" />;

  return (
    <div className="min-h-screen bg-[#f4f5f0] text-[#18241e]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[#17231e] p-5 text-white lg:flex">
        <Sidebar workspaceName={state.workspaceName} user={user} pathname={pathname} />
      </aside>
      {mobileMenu && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden">
          <aside role="dialog" aria-modal="true" aria-label="Menú de navegación" className="flex h-full w-72 flex-col bg-[#17231e] p-5 text-white">
            <button type="button" onClick={() => setMobileMenu(false)} className="absolute right-4 top-4 p-2" aria-label="Cerrar menú"><X aria-hidden="true" /></button>
            <Sidebar workspaceName={state.workspaceName} user={user} pathname={pathname} onNavigate={() => setMobileMenu(false)} />
          </aside>
        </div>
      )}

      <main className="lg:ml-64">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-[#e0e4dd] bg-[#f4f5f0]/90 px-5 backdrop-blur-xl md:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMobileMenu(true)} className="p-2 lg:hidden" aria-label="Abrir menú"><Menu aria-hidden="true" /></button>
            <div><h1 className="text-xl font-semibold tracking-[-0.025em]">{current.label}</h1><p className="hidden text-xs text-[#52665a] sm:block">Tu espacio financiero privado</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" title="Notificaciones" aria-label="Notificaciones" className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#dce1da] bg-white"><Bell size={18} aria-hidden="true" /><span className="sr-only">Notificaciones</span><span aria-hidden="true" className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#e76a58]" /></button>
            <div className="relative">
              <button
                type="button"
                onClick={() => state.accounts.length ? setQuickMenu((open) => !open) : openModal("account")}
                aria-label={state.accounts.length ? "Abrir acciones rápidas" : "Agregar cuenta"}
                aria-haspopup={state.accounts.length ? "menu" : undefined}
                aria-expanded={state.accounts.length ? quickMenu : undefined}
                className="flex h-10 items-center gap-2 rounded-xl bg-[#17231e] px-4 text-sm font-semibold text-white"
              >
                <Plus size={17} aria-hidden="true" /> <span className="hidden sm:inline">{state.accounts.length ? "Agregar" : "Cuenta"}</span>
              </button>
              {quickMenu && (
                <div role="menu" className="absolute right-0 top-12 z-30 w-60 overflow-hidden rounded-2xl border border-[#dce1da] bg-white p-2 shadow-[0_18px_50px_rgba(23,35,30,.16)]">
                  <button type="button" role="menuitem" onClick={() => openModal("transaction")} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-[#f1f4ef]">
                    <CircleDollarSign size={18} className="text-[#4f6c5c]" aria-hidden="true" />
                    <span><span className="block">Ingreso o gasto</span><span className="mt-0.5 block text-xs font-normal text-[#6b786f]">Registrar un movimiento</span></span>
                  </button>
                  <button type="button" role="menuitem" disabled={state.accounts.length < 2} onClick={() => openModal("transfer")} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-[#f1f4ef] disabled:cursor-not-allowed disabled:opacity-45">
                    <ArrowRightLeft size={18} className="text-[#4f6c5c]" aria-hidden="true" />
                    <span><span className="block">Transferir entre cuentas</span><span className="mt-0.5 block text-xs font-normal text-[#6b786f]">Banco, billetera o tarjeta</span></span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => openModal("account")} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-[#f1f4ef]">
                    <WalletCards size={18} className="text-[#4f6c5c]" aria-hidden="true" />
                    <span><span className="block">Nueva cuenta</span><span className="mt-0.5 block text-xs font-normal text-[#6b786f]">Agregar banco o billetera</span></span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-5 md:p-8 lg:p-10">
          {error && <div role="alert" className="mb-5 rounded-2xl border border-[#e8c9bf] bg-[#fff4ef] px-4 py-3 text-sm text-[#914f3d]">{error}</div>}
          {saving && <div className="mb-5 text-xs font-medium text-[#587164]" aria-live="polite">Guardando cambios…</div>}
          {children}
          <footer className="mt-10 border-t border-[#dde2db] pt-5 text-xs text-[#5e6d63]">RutaSaldo · Tus datos permanecen aislados en tu workspace</footer>
        </div>
      </main>

      {modal === "transaction" && <TransactionForm accounts={state.accounts} categories={state.categories} onSave={addTransaction} onClose={() => setModal(null)} />}
      {modal === "transfer" && <TransferForm accounts={state.accounts} onSave={addTransfer} onClose={() => setModal(null)} />}
      {modal === "account" && <AccountForm onSave={addAccount} onClose={() => setModal(null)} />}
    </div>
  );
}

function Sidebar({ workspaceName, user, pathname, onNavigate }: { workspaceName: string; user: User; pathname: string; onNavigate?: () => void }) {
  return <>
    <div className="flex items-center gap-3 px-2"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#b7f34b] text-[#17231e]"><BrandMark size={22} /></span><span className="text-lg font-semibold tracking-tight">RutaSaldo</span></div>
    <div className="mt-8 rounded-xl border border-white/10 bg-white/[.04] p-3"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#aebbb3]">Workspace</p><div className="mt-2 flex items-center justify-between text-left text-sm font-medium">{workspaceName}<ChevronDown size={15} aria-hidden="true" /></div></div>
    <nav className="mt-7 space-y-1.5" aria-label="Navegación financiera">{navigation.map((item) => { const Icon = item.icon; const active = pathname.startsWith(item.href); return <Link key={item.href} href={item.href} onClick={onNavigate} className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${active ? "bg-[#b7f34b] text-[#17231e]" : "text-[#aab7af] hover:bg-white/[.06] hover:text-white"}`}><Icon size={18} aria-hidden="true" />{item.label}</Link>; })}</nav>
    <div className="mt-auto space-y-1.5"><form action={logOut}><button type="submit" className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-[#aab7af] hover:bg-white/[.06]"><LogOut size={18} aria-hidden="true" /> Cerrar sesión</button></form><div className="mt-4 flex items-center gap-3 border-t border-white/10 px-2 pt-5"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#d4e5d9] text-sm font-semibold text-[#21352b]">{(user.name ?? user.email ?? "U").slice(0, 2).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-medium">{user.name ?? "Usuario de RutaSaldo"}</p><p className="truncate text-xs text-[#aebbb3]">{user.email}</p></div></div></div>
  </>;
}
