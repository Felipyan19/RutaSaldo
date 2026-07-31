"use client";

import { useState } from "react";
import { Account, Category, Transaction, TransactionKind, Transfer } from "@/lib/finance";
import { Modal } from "./modal";

const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-[#dce1da] bg-white px-3 text-sm outline-none transition focus:border-[#526b5e] focus:ring-2 focus:ring-[#526b5e]/10";

export function TransactionForm({
  accounts,
  categories,
  onSave,
  onClose,
}: {
  accounts: Account[];
  categories: Category[];
  onSave: (transaction: Transaction) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<TransactionKind>("expense");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSave({
      id: crypto.randomUUID(),
      kind,
      description: String(data.get("description")),
      amount: Number(data.get("amount")),
      accountId: String(data.get("accountId")),
      categoryId: String(data.get("categoryId")),
      date: String(data.get("date")),
    });
  }

  return (
    <Modal title="Nuevo movimiento" subtitle="Registra lo que entró o salió de una cuenta." onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-2 rounded-xl bg-[#edf0eb] p-1">
          {(["expense", "income"] as const).map((value) => (
            <button
              type="button"
              key={value}
              onClick={() => setKind(value)}
              aria-pressed={kind === value}
              className={`h-10 rounded-lg text-sm font-semibold transition ${
                kind === value ? "bg-white text-[#1b2b23] shadow-sm" : "text-[#5e6d63]"
              }`}
            >
              {value === "expense" ? "Gasto" : "Ingreso"}
            </button>
          ))}
        </div>
        <label className="block text-sm font-medium">
          Descripción
          <input name="description" required placeholder="Ej. Mercado" className={inputClass} />
        </label>
        <label className="block text-sm font-medium">
          Valor
          <input name="amount" required min="1" type="number" placeholder="$ 0" className={inputClass} />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm font-medium">
            Cuenta
            <select name="accountId" className={inputClass}>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.institution}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Categoría
            <select name="categoryId" className={inputClass}>
              {categories.filter((category) => kind === "income" ? category.name === "Ingresos" : category.name !== "Ingresos").map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm font-medium">
          Fecha
          <input name="date" required type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} />
        </label>
        <button type="submit" className="h-12 w-full rounded-xl bg-[#17231e] text-sm font-semibold text-white hover:bg-[#26372f]">
          Guardar movimiento
        </button>
      </form>
    </Modal>
  );
}

export function AccountForm({
  onSave,
  onClose,
}: {
  onSave: (account: Account) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<Account["kind"]>("bank");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const isCreditCard = kind === "credit_card";
    const currentDebt = Number(data.get("openingBalance"));
    onSave({
      id: crypto.randomUUID(),
      name: String(data.get("name")),
      institution: String(data.get("institution")),
      kind,
      openingBalance: isCreditCard ? -Math.abs(currentDebt) : currentDebt,
      color: "#4b8068",
      creditCardDetails: isCreditCard ? {
        creditLimit: Number(data.get("creditLimit")),
        statementDay: Number(data.get("statementDay")),
        paymentDueDay: Number(data.get("paymentDueDay")),
        lastFourDigits: String(data.get("lastFourDigits") ?? "").trim() || null,
        interestRate: Number(data.get("interestRate")),
      } : null,
    });
  }
  return (
    <Modal title="Agregar cuenta" subtitle="Banco, billetera, efectivo o tarjeta de crédito." onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <label className="block text-sm font-medium">
          Entidad
          <input name="institution" required placeholder="Ej. RappiPay" className={inputClass} />
        </label>
        <label className="block text-sm font-medium">
          Nombre de la cuenta
          <input name="name" required placeholder="Ej. Cuenta principal" className={inputClass} />
        </label>
        <label className="block text-sm font-medium">
          Tipo
          <select name="kind" value={kind} onChange={(event) => setKind(event.target.value as Account["kind"])} className={inputClass}>
            <option value="bank">Cuenta bancaria</option>
            <option value="wallet">Billetera digital</option>
            <option value="cash">Efectivo</option>
            <option value="credit_card">Tarjeta de crédito</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          {kind === "credit_card" ? "Deuda actual" : "Saldo inicial"}
          <input name="openingBalance" required min="0" type="number" placeholder="$ 0" className={inputClass} />
        </label>
        {kind === "credit_card" && (
          <div className="space-y-5 rounded-2xl border border-[#dce1da] bg-[#f7f8f4] p-4">
            <p className="text-sm font-semibold">Datos de la tarjeta</p>
            <label className="block text-sm font-medium">
              Cupo total
              <input name="creditLimit" required min="1" type="number" placeholder="$ 0" className={inputClass} />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm font-medium">
                Día de corte
                <input name="statementDay" required min="1" max="31" type="number" placeholder="15" className={inputClass} />
              </label>
              <label className="block text-sm font-medium">
                Día de pago
                <input name="paymentDueDay" required min="1" max="31" type="number" placeholder="5" className={inputClass} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm font-medium">
                Últimos 4 dígitos
                <input name="lastFourDigits" inputMode="numeric" pattern="\d{4}" maxLength={4} placeholder="1234" className={inputClass} />
              </label>
              <label className="block text-sm font-medium">
                Tasa E.A. (%)
                <input name="interestRate" min="0" max="500" step="0.01" type="number" placeholder="Opcional" className={inputClass} />
              </label>
            </div>
          </div>
        )}
        <button type="submit" className="h-12 w-full rounded-xl bg-[#17231e] text-sm font-semibold text-white hover:bg-[#26372f]">
          {kind === "credit_card" ? "Crear tarjeta" : "Crear cuenta"}
        </button>
      </form>
    </Modal>
  );
}

export function TransferForm({
  accounts,
  onSave,
  onClose,
}: {
  accounts: Account[];
  onSave: (transfer: Transfer) => void;
  onClose: () => void;
}) {
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(accounts.find((account) => account.id !== accounts[0]?.id)?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
      setError("Selecciona dos cuentas diferentes.");
      return;
    }
    const data = new FormData(event.currentTarget);
    onSave({
      id: crypto.randomUUID(),
      fromAccountId,
      toAccountId,
      amount: Number(data.get("amount")),
      description: String(data.get("description")),
      date: String(data.get("date")),
    });
  }

  return (
    <Modal title="Transferir dinero" subtitle="Mueve saldo entre tus cuentas sin registrarlo como ingreso o gasto." onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        {error && <p role="alert" className="rounded-xl bg-[#fff4ef] px-3 py-2 text-sm text-[#914f3d]">{error}</p>}
        <label className="block text-sm font-medium">
          Desde
          <select value={fromAccountId} onChange={(event) => {
            const next = event.target.value;
            setFromAccountId(next);
            if (next === toAccountId) setToAccountId(accounts.find((account) => account.id !== next)?.id ?? "");
            setError(null);
          }} className={inputClass}>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.institution} · {account.name}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Hacia
          <select value={toAccountId} onChange={(event) => { setToAccountId(event.target.value); setError(null); }} className={inputClass}>
            {accounts.filter((account) => account.id !== fromAccountId).map((account) => <option key={account.id} value={account.id}>{account.institution} · {account.name}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Valor
          <input name="amount" required min="1" type="number" placeholder="$ 0" className={inputClass} />
        </label>
        <label className="block text-sm font-medium">
          Descripción
          <input name="description" required defaultValue="Transferencia entre cuentas" maxLength={200} className={inputClass} />
        </label>
        <label className="block text-sm font-medium">
          Fecha
          <input name="date" required type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} />
        </label>
        <p className="rounded-xl bg-[#eef3ef] px-3 py-2 text-xs text-[#52665a]">
          Si el destino es una tarjeta de crédito, la transferencia se registra como pago y reduce su deuda.
        </p>
        <button type="submit" className="h-12 w-full rounded-xl bg-[#17231e] text-sm font-semibold text-white hover:bg-[#26372f]">
          Confirmar transferencia
        </button>
      </form>
    </Modal>
  );
}
