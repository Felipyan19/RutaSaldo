"use client";

import { useMemo, useState } from "react";
import { CircleDollarSign, Layers3, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import type { Category } from "@/lib/finance";
import { formatCOP } from "@/lib/finance";
import { Modal } from "@/components/modal";
import { TransactionList } from "./transaction-list";
import { useFinance } from "./finance-provider";

const fieldClass = "mt-2 h-11 w-full rounded-xl border border-[#dce1da] bg-white px-3 text-sm outline-none focus:border-[#526b5e] focus:ring-2 focus:ring-[#526b5e]/10";

export function CategoriesPage() {
  const { state, createCategory, updateCategory, deleteCategory, saving } = useFinance();
  const [selected, setSelected] = useState<Category | null>(null);
  const [editing, setEditing] = useState<Category | "new" | null>(null);

  const analysis = useMemo(() => {
    const expenseRows = state.transactions.filter((item) => item.kind === "expense" && !item.transferId);
    const totals = state.categories.map((category) => ({
      ...category,
      amount: expenseRows.filter((item) => item.categoryId === category.id).reduce((sum, item) => sum + item.amount, 0),
      count: state.transactions.filter((item) => item.categoryId === category.id).length,
    })).sort((a, b) => b.amount - a.amount);
    const uncategorized = state.transactions.filter((item) => !item.categoryId && item.kind !== "transfer").length;
    return {
      totals,
      totalExpense: totals.reduce((sum, item) => sum + item.amount, 0),
      active: totals.filter((item) => item.count > 0).length,
      top: totals.find((item) => item.amount > 0) ?? null,
      uncategorized,
    };
  }, [state]);
  const maxCategory = Math.max(1, ...analysis.totals.map((item) => item.amount));

  async function saveCategory(category: Category) {
    const ok = editing === "new" ? await createCategory(category) : await updateCategory(category);
    if (ok) { setEditing(null); setSelected(category); }
  }

  async function removeCategory(category: Category) {
    if (!window.confirm(`¿Eliminar la categoría “${category.name}”?`)) return;
    if (await deleteCategory(category.id)) { setSelected(null); setEditing(null); }
  }

  return <section className="space-y-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-2xl"><h1 className="text-3xl font-semibold tracking-[-0.04em]">Categorías</h1><p className="mt-2 text-sm leading-6 text-[#5e6d63]">Descubre qué categorías concentran tus gastos y cuáles necesitan organización.</p></div>
      <button type="button" onClick={() => setEditing("new")} className="flex h-10 w-fit shrink-0 items-center gap-2 rounded-xl bg-[#17231e] px-4 text-sm font-semibold text-white"><Plus size={16} aria-hidden="true" />Nueva categoría</button>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={Layers3} label="Categorías creadas" value={String(state.categories.length)} />
      <Metric icon={Sparkles} label="Categorías activas" value={String(analysis.active)} />
      <Metric icon={CircleDollarSign} label="Gasto categorizado" value={formatCOP(analysis.totalExpense)} />
      <Metric icon={Sparkles} label="Sin categoría" value={String(analysis.uncategorized)} />
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <div className="rounded-3xl border border-[#e0e4dd] bg-white p-5 md:p-7">
        <h2 className="font-semibold">Comportamiento por categoría</h2>
        <p className="mt-1 text-xs text-[#5e6d63]">Gastos acumulados de mayor a menor.</p>
        <div className="mt-6 space-y-4">
          {analysis.totals.filter((item) => item.amount > 0).slice(0, 6).map((category) => <div key={category.id}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="flex min-w-0 items-center gap-2 font-medium"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} /><span className="truncate">{category.name}</span></span><span className="shrink-0 font-semibold">{formatCOP(category.amount)}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-[#edf0eb]"><div className="h-full rounded-full" style={{ width: `${Math.max(5, (category.amount / maxCategory) * 100)}%`, backgroundColor: category.color }} /></div>
          </div>)}
          {!analysis.totals.some((item) => item.amount > 0) && <p className="rounded-2xl border border-dashed border-[#cbd5cc] p-6 text-center text-sm text-[#5e6d63]">El análisis aparecerá cuando registres gastos.</p>}
        </div>
      </div>

      <div className="rounded-3xl border border-[#e0e4dd] bg-white p-5 md:p-7">
        <h2 className="font-semibold">Lectura rápida</h2>
        {analysis.top ? <div className="mt-5"><span className="grid h-12 w-12 place-items-center rounded-2xl text-xl text-white" style={{ backgroundColor: analysis.top.color }}>{analysis.top.icon}</span><p className="mt-4 text-xs text-[#5e6d63]">Mayor gasto acumulado</p><p className="mt-1 text-xl font-semibold">{analysis.top.name}</p><p className="mt-2 text-sm text-[#5e6d63]">Representa {analysis.totalExpense ? Math.round((analysis.top.amount / analysis.totalExpense) * 100) : 0}% de tus gastos categorizados.</p><p className="mt-4 text-2xl font-semibold">{formatCOP(analysis.top.amount)}</p></div> : <p className="mt-5 text-sm leading-6 text-[#5e6d63]">Todavía no hay gastos suficientes para identificar una categoría dominante.</p>}
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {state.categories.map((category) => {
        const count = state.transactions.filter((item) => item.categoryId === category.id).length;
        const amount = analysis.totals.find((item) => item.id === category.id)?.amount ?? 0;
        return <button key={category.id} type="button" onClick={() => setSelected(category)} className="flex items-center gap-4 rounded-2xl border border-[#e0e4dd] bg-white p-5 text-left hover:border-[#cbd5cc] hover:shadow-[0_10px_26px_rgba(23,35,30,.06)]">
          <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-xl text-lg text-white" style={{ backgroundColor: category.color }}>{category.icon}</span>
          <span className="min-w-0 flex-1"><span className="block truncate font-medium">{category.name}</span><span className="mt-1 block text-xs text-[#5e6d63]">{count} {count === 1 ? "movimiento" : "movimientos"} · {formatCOP(amount)}</span></span>
        </button>;
      })}
    </div>

    {selected && !editing && <Modal title={`${selected.icon} ${selected.name}`} subtitle={`${state.transactions.filter((item) => item.categoryId === selected.id).length} movimientos registrados`} onClose={() => setSelected(null)}>
      <div className="mb-5 flex gap-2">
        <button type="button" onClick={() => setEditing(selected)} className="flex h-10 items-center gap-2 rounded-xl border border-[#ccd4cd] bg-white px-4 text-sm font-semibold"><Pencil size={15} aria-hidden="true" /> Editar</button>
        <button type="button" onClick={() => void removeCategory(selected)} disabled={saving} className="flex h-10 items-center gap-2 rounded-xl border border-[#ecd3cc] bg-[#fff8f5] px-4 text-sm font-semibold text-[#9a4d3b] disabled:opacity-50"><Trash2 size={15} aria-hidden="true" /> Eliminar</button>
      </div>
      <TransactionList state={{ ...state, transactions: state.transactions.filter((item) => item.categoryId === selected.id) }} />
    </Modal>}

    {editing && <CategoryEditor category={editing === "new" ? null : editing} saving={saving} onClose={() => setEditing(null)} onSave={saveCategory} />}
  </section>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Layers3; label: string; value: string }) {
  return <div className="rounded-2xl border border-[#e0e4dd] bg-white p-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eef3ef] text-[#4f6c5c]"><Icon size={17} /></span><p className="mt-4 text-xs text-[#5e6d63]">{label}</p><p className="mt-1 break-words text-xl font-semibold tracking-tight">{value}</p></div>;
}

function CategoryEditor({ category, saving, onClose, onSave }: { category: Category | null; saving: boolean; onClose: () => void; onSave: (category: Category) => Promise<void> }) {
  const [icon, setIcon] = useState(category?.icon ?? "💸");
  const [color, setColor] = useState(category?.color ?? "#4b8068");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void onSave({ id: category?.id ?? crypto.randomUUID(), name: String(data.get("name")).trim(), icon: icon.trim(), color });
  }

  return <Modal title={category ? "Editar categoría" : "Nueva categoría"} subtitle="Usa un nombre, un emoji y un color fáciles de reconocer." onClose={onClose}>
    <form onSubmit={submit} className="space-y-5">
      <label className="block text-sm font-medium">Nombre<input name="name" required maxLength={60} defaultValue={category?.name} placeholder="Ej. Mascotas" className={fieldClass} /></label>
      <div className="grid grid-cols-[1fr_auto] gap-4">
        <label className="block text-sm font-medium">Emoji<input name="icon" required value={icon} onChange={(event) => setIcon(event.target.value)} maxLength={24} placeholder="🐶" className={fieldClass} /></label>
        <label className="block text-sm font-medium">Color<input name="color" type="color" value={color} onChange={(event) => setColor(event.target.value)} className="mt-2 h-11 w-16 rounded-xl border border-[#dce1da] bg-white p-1" /></label>
      </div>
      <div className="rounded-2xl border border-[#e0e4dd] bg-[#f7f8f4] p-4"><p className="text-xs text-[#5e6d63]">Vista previa</p><div className="mt-3 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl text-lg text-white" style={{ backgroundColor: color }}>{icon || "•"}</span><span className="font-medium">{category?.name ?? "Nueva categoría"}</span></div></div>
      <button type="submit" disabled={saving || !icon.trim()} className="h-12 w-full rounded-xl bg-[#17231e] text-sm font-semibold text-white disabled:opacity-50">{saving ? "Guardando…" : category ? "Guardar cambios" : "Crear categoría"}</button>
    </form>
  </Modal>;
}
