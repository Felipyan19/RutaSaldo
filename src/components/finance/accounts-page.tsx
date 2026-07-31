"use client";

import { useState } from "react";
import { ArrowRightLeft, CreditCard, Plus } from "lucide-react";
import { Account, accountBalance, creditCardAvailable, creditCardDebt, FinanceState, formatCOP, Transfer } from "@/lib/finance";
import { useFinance } from "./finance-provider";
import { AccountForm, TransferForm } from "@/components/forms";

const accountKindLabel: Record<Account["kind"], string> = {
  bank: "Cuenta bancaria",
  wallet: "Billetera",
  cash: "Efectivo",
  credit_card: "Tarjeta de crédito",
};

export function AccountsPage() {
  const { state, createAccount, createTransfer } = useFinance();
  const [modal, setModal] = useState<"account" | "transfer" | null>(null);

  function addAccount(account: Account) {
    void createAccount(account);
    setModal(null);
  }

  function addTransfer(transfer: Transfer) {
    void createTransfer(transfer);
    setModal(null);
  }

  return (
    <section>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Todas tus cuentas</h2>
          <p className="mt-1 text-sm text-[#5e6d63]">Bancos, billeteras, efectivo y tarjetas en un solo lugar.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setModal("transfer")}
            disabled={state.accounts.length < 2}
            className="flex h-10 items-center gap-2 rounded-xl border border-[#ccd4cd] bg-white px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowRightLeft size={16} aria-hidden="true" /> Transferir
          </button>
          <button type="button" onClick={() => setModal("account")} className="flex h-10 items-center gap-2 rounded-xl bg-[#17231e] px-4 text-sm font-semibold text-white">
            <Plus size={16} aria-hidden="true" /> Agregar
          </button>
        </div>
      </div>

      {!state.accounts.length && (
        <div className="mb-4 rounded-3xl border border-dashed border-[#cbd5cc] bg-white p-8 text-center">
          <p className="font-medium">Aún no tienes cuentas</p>
          <p className="mt-1 text-sm text-[#5e6d63]">Agrega tu primera cuenta o tarjeta para comenzar desde cero.</p>
          <button type="button" onClick={() => setModal("account")} className="mt-5 rounded-xl bg-[#17231e] px-4 py-2.5 text-sm font-semibold text-white">Agregar primera cuenta</button>
        </div>
      )}

      {state.accounts.length === 1 && (
        <p className="mb-4 rounded-2xl bg-[#eef3ef] p-4 text-sm text-[#52665a]">Agrega una segunda cuenta para poder transferir dinero entre ellas.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {state.accounts.map((account) => account.kind === "credit_card"
          ? <CreditCardAccount key={account.id} account={account} state={state} />
          : <AssetAccount key={account.id} account={account} state={state} />)}
      </div>

      {modal === "account" && <AccountForm onSave={addAccount} onClose={() => setModal(null)} />}
      {modal === "transfer" && <TransferForm accounts={state.accounts} onSave={addTransfer} onClose={() => setModal(null)} />}
    </section>
  );
}

function AccountHeader({ account }: { account: Account }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl text-white" style={{ backgroundColor: account.color }}>
        <CreditCard size={21} />
      </span>
      <span className="rounded-full bg-[#eef1ec] px-3 py-1 text-[10px] uppercase tracking-wide text-[#5e6d63]">{accountKindLabel[account.kind]}</span>
    </div>
  );
}

function AssetAccount({ account, state }: { account: Account; state: FinanceState }) {
  return (
    <article className="rounded-3xl border border-[#e0e4dd] bg-white p-6">
      <AccountHeader account={account} />
      <p className="mt-7 text-sm font-medium">{account.institution}</p>
      <p className="text-xs text-[#5e6d63]">{account.name}</p>
      <p className="mt-4 text-2xl font-semibold tracking-tight">{formatCOP(accountBalance(account, state.transactions))}</p>
      <p className="mt-1 text-xs text-[#5e6d63]">Saldo disponible</p>
    </article>
  );
}

function CreditCardAccount({ account, state }: { account: Account; state: FinanceState }) {
  const details = account.creditCardDetails;
  const debt = creditCardDebt(account, state.transactions);
  const available = creditCardAvailable(account, state.transactions);
  return (
    <article className="rounded-3xl border border-[#d8ddd7] bg-[#17231e] p-6 text-white">
      <AccountHeader account={account} />
      <p className="mt-7 text-sm font-medium">{account.institution}</p>
      <p className="text-xs text-[#aebbb3]">{account.name}{details?.lastFourDigits ? ` · •••• ${details.lastFourDigits}` : ""}</p>
      <p className="mt-4 text-2xl font-semibold tracking-tight">{formatCOP(debt)}</p>
      <p className="mt-1 text-xs text-[#aebbb3]">Deuda actual</p>
      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-xs">
        <div><p className="text-[#aebbb3]">Cupo disponible</p><p className="mt-1 font-semibold">{formatCOP(available)}</p></div>
        <div><p className="text-[#aebbb3]">Cupo total</p><p className="mt-1 font-semibold">{formatCOP(details?.creditLimit ?? 0)}</p></div>
        <div><p className="text-[#aebbb3]">Corte</p><p className="mt-1 font-semibold">Día {details?.statementDay ?? "—"}</p></div>
        <div><p className="text-[#aebbb3]">Pago</p><p className="mt-1 font-semibold">Día {details?.paymentDueDay ?? "—"}</p></div>
      </div>
    </article>
  );
}
