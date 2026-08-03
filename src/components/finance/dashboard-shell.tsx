"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRightLeft, Bell, CheckCheck, ChevronDown, CircleDollarSign, LayoutDashboard, LogOut, Menu, Mic, Plus, ScanLine, Settings, Tags, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { logOut } from "@/app/actions";
import { Account, Transaction, Transfer } from "@/lib/finance";
import { buildFinanceNotifications } from "@/lib/notifications";
import { useFinance } from "./finance-provider";
import { AccountForm, TransactionForm, TransferForm } from "@/components/forms";
import { ReceiptScanner } from "@/components/ai/receipt-scanner";
import { VoiceFinanceCapture } from "@/components/ai/voice-finance-capture";
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
type ModalName = "transaction" | "transfer" | "account" | "receipt" | "voice" | null;

export function DashboardShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, error, saving, createAccount, createTransaction, createTransfer } = useFinance();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [quickMenu, setQuickMenu] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationNow, setNotificationNow] = useState<Date | null>(null);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalName>(null);
  const current = navigation.find((item) => pathname.startsWith(item.href)) ?? navigation[0];
  const notificationStorageKey = `rutasaldo:read-notifications:${user.email ?? state.workspaceName}`;
  const notifications = useMemo(() => notificationNow ? buildFinanceNotifications(state, notificationNow) : [], [notificationNow, state]);
  const unreadNotifications = notifications.filter((notification) => !readNotificationIds.includes(notification.id));
  const contextualModal: Exclude<ModalName, null> | null = pathname.startsWith("/cuentas") ? "account" : pathname.startsWith("/movimientos") ? "transaction" : null;
  const showPrimaryAction = pathname.startsWith("/resumen") || pathname.startsWith("/cuentas") || pathname.startsWith("/movimientos");

  useEffect(() => {
    setNotificationNow(new Date());
    try {
      const stored = window.localStorage.getItem(notificationStorageKey);
      setReadNotificationIds(stored ? JSON.parse(stored) : []);
    } catch {
      setReadNotificationIds([]);
    }
  }, [notificationStorageKey]);

  function saveReadNotifications(ids: string[]) {
    const uniqueIds = [...new Set(ids)];
    setReadNotificationIds(uniqueIds);
    try { window.localStorage.setItem(notificationStorageKey, JSON.stringify(uniqueIds)); } catch {}
  }

  function openModal(nextModal: Exclude<ModalName, null>) {
    setQuickMenu(false);
    setNotificationsOpen(false);
    setModal(nextModal);
  }

  function handlePrimaryAction() {
    setNotificationsOpen(false);
    if (!state.accounts.length) return openModal("account");
    if (contextualModal) return openModal(contextualModal);
    setQuickMenu((open) => !open);
  }

  function openNotification(id: string, href: string) {
    saveReadNotifications([...readNotificationIds, id]);
    setNotificationsOpen(false);
    router.push(href);
  }

  function addTransaction(transaction: Transaction) { void createTransaction(transaction); setModal(null); }
  function addTransfer(transfer: Transfer) { void createTransfer(transfer); setModal(null); }
  function addAccount(account: Account) { void createAccount(account); setModal(null); }

  if (!state) return <RutaSaldoLoader label="Cargando tus registros…" variant="light" />;

  return (
    <div className="min-h-screen bg-[#f4f5f0] text-[#18241e]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[#17231e] p-5 text-white lg:flex">
        <Sidebar workspaceName={state.workspaceName} user={user} pathname={pathname} />
      </aside>
      {mobileMenu && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Cerrar menú de navegación" onClick={() => setMobileMenu(false)} className="absolute inset-0 bg-black/40" />
          <aside role="dialog" aria-modal="true" aria-label="Menú de navegación" className="relative flex h-full w-[min(20rem,84vw)] flex-col bg-[#17231e] p-5 text-white shadow-2xl">
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
            <div className="relative">
              <button type="button" title="Notificaciones" aria-label={`Notificaciones${unreadNotifications.length ? `, ${unreadNotifications.length} sin leer` : ""}`} aria-haspopup="dialog" aria-expanded={notificationsOpen} onClick={() => { setQuickMenu(false); setNotificationsOpen((open) => !open); }} className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#dce1da] bg-white">
                <Bell size={18} aria-hidden="true" />
                {unreadNotifications.length > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#e76a58] px-1 text-[10px] font-bold text-white">{unreadNotifications.length > 9 ? "9+" : unreadNotifications.length}</span>}
              </button>
              {notificationsOpen && (
                <>
                  <button type="button" aria-label="Cerrar notificaciones" onClick={() => setNotificationsOpen(false)} className="fixed inset-0 z-20 cursor-default bg-black/10 sm:bg-transparent" />
                  <section role="dialog" aria-modal="true" aria-label="Centro de notificaciones" className="fixed inset-x-3 top-24 z-30 flex max-h-[calc(100dvh-7rem)] flex-col overflow-hidden rounded-2xl border border-[#dce1da] bg-white shadow-[0_18px_50px_rgba(23,35,30,.20)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:max-h-[32rem] sm:w-[22rem]">
                    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#edf0eb] px-4 py-3">
                      <div className="min-w-0"><h2 className="text-sm font-semibold">Notificaciones</h2><p className="mt-0.5 text-xs leading-5 text-[#6b786f]">Alertas e historial de actividad</p></div>
                      {unreadNotifications.length > 0 && <button type="button" onClick={() => saveReadNotifications([...readNotificationIds, ...notifications.map((item) => item.id)])} className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#4f6c5c]"><CheckCheck size={15} aria-hidden="true" /><span className="hidden min-[390px]:inline">Marcar leídas</span></button>}
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                      {notifications.length === 0 ? <div className="px-5 py-9 text-center"><span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-[#eef3ef] text-[#4f6c5c]"><Bell size={19} /></span><p className="mt-3 text-sm font-semibold">Todo está al día</p><p className="mt-1 text-xs leading-5 text-[#6b786f]">Aquí aparecerán alertas y acciones recientes.</p></div> : notifications.map((notification) => {
                        const Icon = notification.icon;
                        const unread = !readNotificationIds.includes(notification.id);
                        const tone = notification.severity === "urgent" ? "bg-[#fff0ec] text-[#b24e3d]" : notification.severity === "warning" ? "bg-[#fff8e8] text-[#9a6a22]" : "bg-[#eef3ef] text-[#4f6c5c]";
                        return <button key={notification.id} type="button" onClick={() => openNotification(notification.id, notification.href)} className={`flex w-full gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[#f4f6f2] ${unread ? "bg-[#fafbf8]" : "opacity-70"}`}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={18} /></span><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><span className="text-sm font-semibold">{notification.title}</span>{unread && <span aria-label="Sin leer" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#e76a58]" />}</span><span className="mt-1 block text-xs leading-5 text-[#6b786f]">{notification.description}</span></span></button>;
                      })}
                    </div>
                  </section>
                </>
              )}
            </div>

            {showPrimaryAction && (
              <div className="relative">
                <button type="button" onClick={handlePrimaryAction} aria-label={contextualModal === "account" ? "Agregar cuenta" : contextualModal === "transaction" ? "Agregar movimiento" : "Abrir acciones rápidas"} aria-haspopup={!contextualModal && state.accounts.length ? "menu" : undefined} aria-expanded={!contextualModal && state.accounts.length ? quickMenu : undefined} className="flex h-10 items-center gap-2 rounded-xl bg-[#17231e] px-4 text-sm font-semibold text-white">
                  <Plus size={17} aria-hidden="true" />
                  <span className="hidden sm:inline">{!state.accounts.length || contextualModal === "account" ? "Cuenta" : contextualModal === "transaction" ? "Movimiento" : "Agregar"}</span>
                </button>
                {quickMenu && !contextualModal && (
                  <>
                    <button type="button" aria-label="Cerrar acciones rápidas" onClick={() => setQuickMenu(false)} className="fixed inset-0 z-20 cursor-default bg-transparent" />
                    <div role="menu" className="absolute right-0 top-12 z-30 w-64 overflow-hidden rounded-2xl border border-[#dce1da] bg-white p-2 shadow-[0_18px_50px_rgba(23,35,30,.16)]">
                      <button type="button" role="menuitem" onClick={() => openModal("transaction")} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-[#f1f4ef]"><CircleDollarSign size={18} className="text-[#4f6c5c]" /><span><span className="block">Ingreso o gasto</span><span className="mt-0.5 block text-xs font-normal text-[#6b786f]">Registrar manualmente</span></span></button>
                      <button type="button" role="menuitem" onClick={() => openModal("voice")} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-[#f1f4ef]"><Mic size={18} className="text-[#4f6c5c]" /><span><span className="block">Registrar por voz</span><span className="mt-0.5 block text-xs font-normal text-[#6b786f]">Gemini completa el borrador</span></span></button>
                      <button type="button" role="menuitem" onClick={() => openModal("receipt")} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-[#f1f4ef]"><ScanLine size={18} className="text-[#4f6c5c]" /><span><span className="block">Escanear factura</span><span className="mt-0.5 block text-xs font-normal text-[#6b786f]">OCR con revisión previa</span></span></button>
                      <button type="button" role="menuitem" disabled={state.accounts.length < 2} onClick={() => openModal("transfer")} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-[#f1f4ef] disabled:opacity-45"><ArrowRightLeft size={18} className="text-[#4f6c5c]" /><span><span className="block">Transferir entre cuentas</span><span className="mt-0.5 block text-xs font-normal text-[#6b786f]">Banco, billetera o tarjeta</span></span></button>
                      <button type="button" role="menuitem" onClick={() => openModal("account")} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-[#f1f4ef]"><WalletCards size={18} className="text-[#4f6c5c]" /><span><span className="block">Nueva cuenta</span><span className="mt-0.5 block text-xs font-normal text-[#6b786f]">Agregar banco o billetera</span></span></button>
                    </div>
                  </>
                )}
              </div>
            )}
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
      {modal === "receipt" && <ReceiptScanner accounts={state.accounts} categories={state.categories} onSave={addTransaction} onClose={() => setModal(null)} />}
      {modal === "voice" && <VoiceFinanceCapture accounts={state.accounts} categories={state.categories} onSaveTransaction={addTransaction} onSaveTransfer={addTransfer} onClose={() => setModal(null)} />}
      {modal === "transfer" && <TransferForm accounts={state.accounts} onSave={addTransfer} onClose={() => setModal(null)} />}
      {modal === "account" && <AccountForm onSave={addAccount} onClose={() => setModal(null)} />}
    </div>
  );
}

function Sidebar({ workspaceName, user, pathname, onNavigate }: { workspaceName: string; user: User; pathname: string; onNavigate?: () => void }) {
  return <>
    <div className="flex items-center gap-3 px-2"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#b7f34b] text-[#17231e]"><BrandMark size={22} /></span><span className="text-lg font-semibold tracking-tight">RutaSaldo</span></div>
    <div className="mt-8 rounded-xl border border-white/10 bg-white/[.04] p-3"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#aebbb3]">Workspace</p><div className="mt-2 flex items-center justify-between text-left text-sm font-medium">{workspaceName}<ChevronDown size={15} /></div></div>
    <nav className="mt-7 space-y-1.5" aria-label="Navegación financiera">{navigation.map((item) => { const Icon = item.icon; const active = pathname.startsWith(item.href); return <Link key={item.href} href={item.href} onClick={onNavigate} className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${active ? "bg-[#b7f34b] text-[#17231e]" : "text-[#aab7af] hover:bg-white/[.06] hover:text-white"}`}><Icon size={18} />{item.label}</Link>; })}</nav>
    <div className="mt-auto space-y-1.5"><form action={logOut}><button type="submit" className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-[#aab7af] hover:bg-white/[.06]"><LogOut size={18} /> Cerrar sesión</button></form><div className="mt-4 flex items-center gap-3 border-t border-white/10 px-2 pt-5"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#d4e5d9] text-sm font-semibold text-[#21352b]">{(user.name ?? user.email ?? "U").slice(0, 2).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-medium">{user.name ?? "Usuario de RutaSaldo"}</p><p className="truncate text-xs text-[#aebbb3]">{user.email}</p></div></div></div>
  </>;
}