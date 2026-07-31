"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { Account, accountBalance, creditCardAvailable, creditCardDebt, FinanceState, formatCOP } from "@/lib/finance";
import { useFinance } from "./finance-provider";
import { Modal } from "@/components/modal";
import { TransactionList } from "./transaction-list";

const accountKindLabel: Record<Account["kind"], string> = {
  bank: "Cuenta bancaria",
  wallet: "Billetera",
  cash: "Efectivo",
  credit_card: "Tarjeta de crédito",
};

export function AccountsPage() {
  const { state } = useFinance();
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  return (
    <section>
      <div className="mb-7">
        <h2 className="text-2xl font-semibold tracking-tight">Todas tus cuentas</h2>
        <p className="mt-1 text-sm text-[#5e6d63]">Bancos, billeteras, efectivo y tarjetas en un solo lugar.</p>
      </div>

      {!state.accounts.length && (
        <div className="mb-4 rounded-3xl border border-dashed border-[#cbd5cc] bg-white p-8 text-center">
          <p className="font-medium">Aún no tienes cuentas</p>
          <p className="mt-1 text-sm text-[#5e6d63]">Usa el botón + del encabezado para agregar tu primera cuenta o tarjeta.</p>
        </div>
      )}

      {state.accounts.length === 1 && (
        <p className="mb-4 rounded-2xl bg-[#eef3ef] p-4 text-sm text-[#52665a]">Agrega una segunda cuenta desde el botón + para poder transferir dinero entre ellas.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {state.accounts.map((account) => account.kind === "credit_card"
          ? <CreditCardAccount key={account.id} account={account} state={state} onOpen={() => setSelectedAccount(account)} />
          : <AssetAccount key={account.id} account={account} state={state} onOpen={() => setSelectedAccount(account)} />)}
      </div>

      {selectedAccount && (
        <Modal title={selectedAccount.name} subtitle={`${selectedAccount.institution} · ${accountKindLabel[selectedAccount.kind]}`} onClose={() => setSelectedAccount(null)}>
          <div className="mb-5 rounded-2xl bg-[#eef3ef] p-4">
            <p className="text-xs text-[#5e6d63]">{selectedAccount.kind === "credit_card" ? "Deuda actual" : "Saldo actual"}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{formatCOP(selectedAccount.kind === "credit_card" ? creditCardDebt(selectedAccount, state.transactions) : accountBalance(selectedAccount, state.transactions))}</p>
          </div>
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><h3 className="font-semibold">Historial de la cuenta</h3><p className="mt-1 text-xs text-[#5e6d63]">Ingresos, gastos y transferencias asociados.</p></div>
              <span className="rounded-full bg-[#edf0eb] px-3 py-1 text-xs text-[#5e6d63]">{state.transactions.filter((item) => item.accountId === selectedAccount.id).length}</span>
            </div>
            <TransactionList state={state} accountId={selectedAccount.id} />
          </div>
        </Modal>
      )}
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

function AssetAccount({ account, state, onOpen }: { account: Account; state: FinanceState; onOpen: () => void }) {
  return (
    <article>
      <button type="button" onClick={onOpen} className="w-full rounded-3xl border border-[#e0e4dd] bg-white p-6 text-left shadow-sm transition hover:border-[#cfd8d0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#526b5e]/30">
        <AccountHeader account={account} />
        <p className="mt-7 text-sm font-medium">{account.institution}</p>
        <p className="text-xs text-[#5e6d63]">{account.name}</p>
        <p className="mt-4 text-2xl font-semibold tracking-tight">{formatCOP(accountBalance(account, state.transactions))}</p>
        <p className="mt-1 text-xs text-[#5e6d63]">Saldo disponible · Ver historial</p>
      </button>
    </article>
  );
}

function CreditCardAccount({ account, state, onOpen }: { account: Account; state: FinanceState; onOpen: () => void }) {
  const details = account.creditCardDetails;
  const debt = creditCardDebt(account, state.transactions);
  const available = creditCardAvailable(account, state.transactions);
  return (
    <article>
      <button type="button" onClick={onOpen} className="w-full rounded-3xl border border-[#d8ddd7] bg-[#17231e] p-6 text-left text-white shadow-sm transition hover:border-[#63746a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#526b5e]/40">
        <AccountHeader account={account} />
        <p className="mt-7 text-sm font-medium">{account.institution}</p>
        <p className="text-xs text-[#aebbb3]">{account.name}{details?.lastFourDigits ? ` · •••• ${details.lastFourDigits}` : ""}</p>
        <p className="mt-4 text-2xl font-semibold tracking-tight">{formatCOP(debt)}</p>
        <p className="mt-1 text-xs text-[#aebbb3]">Deuda actual · Ver historial</p>
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-xs">
          <div><p className="text-[#aebbb3]">Cupo disponible</p><p className="mt-1 font-semibold">{formatCOP(available)}</p></div>
          <div><p className="text-[#aebbb3]">Cupo total</p><p className="mt-1 font-semibold">{formatCOP(details?.creditLimit ?? 0)}</p></div>
          <div><p className="text-[#aebbb3]">Corte</p><p className="mt-1 font-semibold">Día {details?.statementDay ?? "—"}</p></div>
          <div><p className="text-[#aebbb3]">Pago</p><p className="mt-1 font-semibold">Día {details?.paymentDueDay ?? "—"}</p></div>
        </div>
      </button>
    </article>
  );
}
