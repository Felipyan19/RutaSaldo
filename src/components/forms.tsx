"use client";

import { useState } from "react";
import { Account, Category, Transaction, TransactionKind } from "@/lib/finance";
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
              className={`h-10 rounded-lg text-sm font-semibold transition ${
                kind === value ? "bg-white text-[#1b2b23] shadow-sm" : "text-[#748078]"
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
              {categories.filter((category) => kind === "income" ? category.id === "salary" : category.id !== "salary").map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm font-medium">
          Fecha
          <input name="date" required type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} />
        </label>
        <button className="h-12 w-full rounded-xl bg-[#17231e] text-sm font-semibold text-white hover:bg-[#26372f]">
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
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSave({
      id: crypto.randomUUID(),
      name: String(data.get("name")),
      institution: String(data.get("institution")),
      kind: data.get("kind") as Account["kind"],
      openingBalance: Number(data.get("openingBalance")),
      color: "#4b8068",
    });
  }
  return (
    <Modal title="Agregar cuenta" subtitle="Banco, billetera digital o efectivo." onClose={onClose}>
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
          <select name="kind" className={inputClass}>
            <option value="bank">Cuenta bancaria</option>
            <option value="wallet">Billetera digital</option>
            <option value="cash">Efectivo</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          Saldo inicial
          <input name="openingBalance" required min="0" type="number" placeholder="$ 0" className={inputClass} />
        </label>
        <button className="h-12 w-full rounded-xl bg-[#17231e] text-sm font-semibold text-white hover:bg-[#26372f]">
          Crear cuenta
        </button>
      </form>
    </Modal>
  );
}
