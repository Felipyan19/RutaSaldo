"use client";

import { useState } from "react";
import { Banknote, CreditCard, Landmark, WalletCards } from "lucide-react";
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

function accountIcon(kind: Account["kind"]) {
  if (kind === "cash") return Banknote;
  if (kind === "wallet") return WalletCards;
  if (kind === "bank") return Landmark;
  return CreditCard;
}

export function AccountsPage() {
  const { state } = useFinance();
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  return (
    <section>
      <div className="mb-7 max-w-2xl">
        <h2 className="text-2xl font-semibold tracking-tight">Tus cuentas</h2>
        <p className="mt-2 text-sm leading-6 text-[#5e6d63]">Consulta saldos, cupos e historial de bancos, billeteras, efectivo y tarjetas.</p>
      </div>

      {!state.accounts.length && (
        <div className="rounded-3xl border border-dashed border-[#cbd5cc] bg-white px-5 py-10 text-center md:px-8">
          <WalletCards className="mx-auto text-[#66776d]" size={28} aria-hidden="true" />
          <p className="mt-4 font-semibold">Aún no tienes cuentas</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#5e6d63]">Usa la acción del encabezado para agregar una cuenta bancaria, billetera, efectivo o tarjeta.</p>
        </div>
      )}

      {state.accounts.length === 1 && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[#dde8df] bg-[#f3f7f4] p-4 text-sm leading-6 text-[#52665a]">
          <WalletCards className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
          <p>Agrega otra cuenta para habilitar transferencias internas sin registrarlas como ingreso o gasto.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {state.accounts.map((account) => account.kind === "credit_card"
          ? <CreditCardAccount key={account.id} account={account} state={state} onOpen={() => setSelectedAccount(account)} />
          : <AssetAccount key={account.id} account={account} state={state} onOpen={() => setSelectedAccount(account)} />)}
      </div>

      {selectedAccount && (
        <Modal title={selectedAccount.name} subtitle={`${selectedAccount.institution} · ${accountKindLabel[selectedAccount.kind]}`} onClose={() => setSelectedAccount(null)}>
          <div className="mb-6 rounded-2xl bg-[#eef3ef] p-4 md:p-5">
            <p className="text-xs text-[#5e6d63]">{selectedAccount.kind === "credit_card" ? "Deuda actual" : "Saldo actual"}</p>
            <p className="mt-1 break-words text-2xl font-semibold tracking-tight">{formatCOP(selectedAccount.kind === "credit_card" ? creditCardDebt(selectedAccount, state.transactions) : accountBalance(selectedAccount, state.transactions))}</p>
          </div>
          <div>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div><h3 className="font-semibold">Historial</h3><p className="mt-1 text-xs leading-5 text-[#5e6d63]">Ingresos, gastos y transferencias asociados a esta cuenta.</p></div>
              <span className="shrink-0 rounded-full bg-[#edf0eb] px-3 py-1 text-xs text-[#5e6d63]">{state.transactions.filter((item) => item.accountId === selectedAccount.id).length}</span>
            </div>
            <TransactionList state={state} accountId={selectedAccount.id} />
          </div>
        </Modal>
      )}
    </section>
  );
}

function AccountHeader({ account, dark = false }: { account: Account; dark?: boolean }) {
  const Icon = accountIcon(account.kind);
  return (
    <div className="flex items-start justify-between gap-3">
      <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl text-white" style={{ backgroundColor: account.color }}><Icon size={21} /></span>
      <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${dark ? "bg-white/10 text-[#dbe4de]" : "bg-[#eef1ec] text-[#5e6d63]"}`}>{accountKindLabel[account.kind]}</span>
    </div>
  );
}

function AssetAccount({ account, state, onOpen }: { account: Account; state: FinanceState; onOpen: () => void }) {
  return (
    <article>
      <button type="button" onClick={onOpen} aria-label={`Abrir ${account.name} y ver su historial`} className="group h-full w-full rounded-3xl border border-[#e0e4dd] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#cfd8d0] hover:shadow-[0_12px_30px_rgba(23,35,30,.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#526b5e]/30 md:p-6">
        <AccountHeader account={account} />
        <p className="mt-6 truncate text-sm font-medium">{account.institution}</p>
        <p className="mt-0.5 truncate text-xs text-[#5e6d63]">{account.name}</p>
        <p className="mt-4 break-words text-2xl font-semibold tracking-tight">{formatCOP(accountBalance(account, state.transactions))}</p>
        <p className="mt-2 text-xs font-medium text-[#65756c] transition group-hover:text-[#334b3e]">Saldo disponible · Ver historial</p>
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
      <button type="button" onClick={onOpen} aria-label={`Abrir ${account.name} y ver su historial`} className="group h-full w-full rounded-3xl border border-[#2a3932] bg-[#17231e] p-5 text-left text-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#63746a] hover:shadow-[0_12px_30px_rgba(23,35,30,.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#526b5e]/40 md:p-6">
        <AccountHeader account={account} dark />
        <p className="mt-6 truncate text-sm font-medium">{account.institution}</p>
        <p className="mt-0.5 truncate text-xs text-[#aebbb3]">{account.name}{details?.lastFourDigits ? ` · •••• ${details.lastFourDigits}` : ""}</p>
        <p className="mt-4 break-words text-2xl font-semibold tracking-tight">{formatCOP(debt)}</p>
        <p className="mt-2 text-xs font-medium text-[#c1ccc5] transition group-hover:text-white">Deuda actual · Ver historial</p>
        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-4 text-xs">
          <div><p className="text-[#aebbb3]">Disponible</p><p className="mt-1 font-semibold">{formatCOP(available)}</p></div>
          <div><p className="text-[#aebbb3]">Cupo total</p><p className="mt-1 font-semibold">{formatCOP(details?.creditLimit ?? 0)}</p></div>
          <div><p className="text-[#aebbb3]">Corte</p><p className="mt-1 font-semibold">Día {details?.statementDay ?? "—"}</p></div>
          <div><p className="text-[#aebbb3]">Pago</p><p className="mt-1 font-semibold">Día {details?.paymentDueDay ?? "—"}</p></div>
        </div>
      </button>
    </article>
  );
}
