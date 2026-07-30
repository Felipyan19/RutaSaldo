"use client";

import { useState } from "react";
import { CreditCard, Plus } from "lucide-react";
import { Account, accountBalance, formatCOP } from "@/lib/finance";
import { useFinance } from "./finance-provider";
import { AccountForm } from "@/components/forms";

export function AccountsPage() {
  const { state, updateState } = useFinance();
  const [showForm, setShowForm] = useState(false);
  function addAccount(account: Account) { void updateState({ ...state, accounts: [...state.accounts, account] }); setShowForm(false); }
  return <section><div className="mb-7 flex items-center justify-between"><div><h2 className="text-2xl font-semibold tracking-tight">Todas tus cuentas</h2><p className="mt-1 text-sm text-[#5e6d63]">Bancos, billeteras y efectivo en un solo lugar.</p></div><button type="button" onClick={() => setShowForm(true)} className="flex h-10 items-center gap-2 rounded-xl border border-[#ccd4cd] bg-white px-4 text-sm font-semibold"><Plus size={16} aria-hidden="true" /> Agregar</button></div>{!state.accounts.length && <div className="mb-4 rounded-3xl border border-dashed border-[#cbd5cc] bg-white p-8 text-center"><p className="font-medium">Aún no tienes cuentas</p><p className="mt-1 text-sm text-[#5e6d63]">Agrega tu primera cuenta para comenzar desde cero.</p><button type="button" onClick={() => setShowForm(true)} className="mt-5 rounded-xl bg-[#17231e] px-4 py-2.5 text-sm font-semibold text-white">Agregar primera cuenta</button></div>}<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{state.accounts.map((account) => <div key={account.id} className="rounded-3xl border border-[#e0e4dd] bg-white p-6"><div className="flex items-start justify-between"><span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl text-white" style={{ backgroundColor: account.color }}><CreditCard size={21} /></span><span className="rounded-full bg-[#eef1ec] px-3 py-1 text-[10px] uppercase tracking-wide text-[#5e6d63]">{account.kind}</span></div><p className="mt-7 text-sm font-medium">{account.institution}</p><p className="text-xs text-[#5e6d63]">{account.name}</p><p className="mt-4 text-2xl font-semibold tracking-tight">{formatCOP(accountBalance(account, state.transactions))}</p><p className="mt-1 text-xs text-[#5e6d63]">Saldo disponible</p></div>)}</div>{showForm && <AccountForm onSave={addAccount} onClose={() => setShowForm(false)} />}</section>;
}
