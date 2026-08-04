"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CircleDollarSign, Layers3, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import type { Category } from "@/lib/finance";
import { formatCOP } from "@/lib/finance";
import { Modal } from "@/components/modal";
import { TransactionList } from "./transaction-list";
import { useFinance } from "./finance-provider";
import { AnalysisBar, MetricCard, PageHeader, Panel } from "./dashboard-ui";

const fieldClass = "mt-2 h-11 w-full rounded-xl border border-[#dce1da] bg-white px-3 text-sm outline-none focus:border-[#526b5e] focus:ring-2 focus:ring-[#526b5e]/10";

type SortMode = "expense" | "activity" | "name";

export function CategoriesPage() {
  const { state, createCategory, updateCategory, deleteCategory, saving } = useFinance();
  const [selected, setSelected] = useState<Category | null>(null);
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [sort, setSort] = useState<SortMode>("expense");
  const [headerActionsTarget, setHeaderActionsTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setHeaderActionsTarget(document.querySelector<HTMLElement>("main > header > div:last-child"));
  }, []);

  const analysis = useMemo(() => {
    const expenses = state.transactions.filter((item) => item.kind === "expense" && !item.transferId);
    const totals = state.categories.map((category) => ({ ...category, amount: expenses.filter((item) => item.categoryId === category.id).reduce((sum, item) => sum + item.amount, 0), count: state.transactions.filter((item) => item.categoryId === category.id).length }));
    return {
      totals,
      totalExpense: totals.reduce((sum, item) => sum + item.amount, 0),
      active: totals.filter((item) => item.count > 0).length,
      uncategorized: state.transactions.filter((item) => !item.categoryId && item.kind !== "transfer").length,
    };
  }, [state]);
  const maxCategory = Math.max(1, ...analysis.totals.map((item) => item.amount));
  const sortedCategories = [...analysis.totals].sort((a, b) => sort === "expense" ? b.amount - a.amount : sort === "activity" ? b.count - a.count : a.name.localeCompare(b.name, "es"));

  async function saveCategory(category: Category) {
    const ok = editing === "new" ? await createCategory(category) : await updateCategory(category);
    if (ok) { setEditing(null); setSelected(category); }
  }

  async function removeCategory(category: Category) {
    if (!window.confirm(`¿Eliminar la categoría “${category.name}”?`)) return;
    if (await deleteCategory(category.id)) { setSelected(null); setEditing(null); }
  }

  const action = <button type="button" onClick={() => setEditing("new")} className="flex h-10 w-fit items-center gap-2 rounded-xl bg-[#17231e] px-4 text-sm font-semibold text-white"><Plus size={16} aria-hidden="true" /><span className="hidden sm:inline">Categoría</span></button>;

  return <section className="space-y-5">
    {headerActionsTarget && createPortal(action, headerActionsTarget)}
    <PageHeader title="Categorías" description="Descubre qué categorías concentran tus gastos y cuáles necesitan organización." />

    <div className="grid gap-3 sm:grid-cols-3">
      <MetricCard icon={CircleDollarSign} label="Gasto categorizado" value={formatCOP(analysis.totalExpense)} featured />
      <MetricCard icon={Sparkles} label="Categorías activas" value={`${analysis.active} de ${state.categories.length}`} />
      <MetricCard icon={Layers3} label="Movimientos sin categoría" value={String(analysis.uncategorized)} tone={analysis.uncategorized ? "warning" : "positive"} />
    </div>

    <Panel title="Comportamiento por categoría" description="Gastos acumulados de mayor a menor; los valores siempre están visibles y disponibles para lectores de pantalla.">
      <div className="space-y-4">{[...analysis.totals].sort((a, b) => b.amount - a.amount).filter((item) => item.amount > 0).slice(0, 7).map((category) => <AnalysisBar key={category.id} label={`${category.icon} ${category.name}`} value={formatCOP(category.amount)} percentage={(category.amount / maxCategory) * 100} color={category.color} />)}
      {!analysis.totals.some((item) => item.amount > 0) && <p className="rounded-2xl border border-dashed border-[#cbd5cc] p-6 text-center text-sm text-[#5e6d63]">El análisis aparecerá cuando registres gastos.</p>}</div>
    </Panel>

    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-lg font-semibold">Administrar categorías</h2><label className="text-xs font-medium text-[#52665a]">Ordenar por <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="ml-2 h-9 rounded-xl border border-[#dce1da] bg-white px-3 text-sm"><option value="expense">Mayor gasto</option><option value="activity">Mayor actividad</option><option value="name">Nombre</option></select></label></div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{sortedCategories.map((category) => <button key={category.id} type="button" onClick={() => setSelected(category)} className="flex items-center gap-4 rounded-2xl border border-[#e0e4dd] bg-white p-5 text-left hover:border-[#cbd5cc] hover:shadow-[0_10px_26px_rgba(23,35,30,.06)]"><span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-xl text-lg text-white" style={{ backgroundColor: category.color }}>{category.icon}</span><span className="min-w-0 flex-1"><span className="block truncate font-medium">{category.name}</span><span className="mt-1 block text-xs text-[#5e6d63]">{category.count} {category.count === 1 ? "movimiento" : "movimientos"} · {formatCOP(category.amount)}</span></span></button>)}</div>

    {selected && !editing && <Modal title={`${selected.icon} ${selected.name}`} subtitle={`${state.transactions.filter((item) => item.categoryId === selected.id).length} movimientos registrados`} onClose={() => setSelected(null)}><div className="mb-5 flex gap-2"><button type="button" onClick={() => setEditing(selected)} className="flex h-10 items-center gap-2 rounded-xl border border-[#ccd4cd] bg-white px-4 text-sm font-semibold"><Pencil size={15} /> Editar</button><button type="button" onClick={() => void removeCategory(selected)} disabled={saving} className="flex h-10 items-center gap-2 rounded-xl border border-[#ecd3cc] bg-[#fff8f5] px-4 text-sm font-semibold text-[#9a4d3b] disabled:opacity-50"><Trash2 size={15} /> Eliminar</button></div><TransactionList state={{ ...state, transactions: state.transactions.filter((item) => item.categoryId === selected.id) }} /></Modal>}
    {editing && <CategoryEditor category={editing === "new" ? null : editing} saving={saving} onClose={() => setEditing(null)} onSave={saveCategory} />}
  </section>;
}

function CategoryEditor({ category, saving, onClose, onSave }: { category: Category | null; saving: boolean; onClose: () => void; onSave: (category: Category) => Promise<void> }) {
  const [icon, setIcon] = useState(category?.icon ?? "💸");
  const [color, setColor] = useState(category?.color ?? "#4b8068");
  const [dirty, setDirty] = useState(false);
  function close() { if (!dirty || window.confirm("Hay cambios sin guardar. ¿Cerrar de todas formas?")) onClose(); }
  function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); void onSave({ id: category?.id ?? crypto.randomUUID(), name: String(data.get("name")).trim(), icon: icon.trim(), color }); }
  return <Modal title={category ? "Editar categoría" : "Nueva categoría"} subtitle="Usa un nombre, un emoji y un color fáciles de reconocer." onClose={close}><form onSubmit={submit} onChange={() => setDirty(true)} className="space-y-5"><label className="block text-sm font-medium">Nombre<input name="name" required maxLength={60} defaultValue={category?.name} placeholder="Ej. Mascotas" className={fieldClass} /></label><div className="grid grid-cols-[1fr_auto] gap-4"><label className="block text-sm font-medium">Emoji<input name="icon" required value={icon} onChange={(event) => { setIcon(event.target.value); setDirty(true); }} maxLength={24} placeholder="🐶" className={fieldClass} /></label><label className="block text-sm font-medium">Color<input name="color" type="color" value={color} onChange={(event) => { setColor(event.target.value); setDirty(true); }} className="mt-2 h-11 w-16 rounded-xl border border-[#dce1da] bg-white p-1" /></label></div><div className="rounded-2xl border border-[#e0e4dd] bg-[#f7f8f4] p-4"><p className="text-xs text-[#5e6d63]">Vista previa</p><div className="mt-3 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl text-lg text-white" style={{ backgroundColor: color }}>{icon || "•"}</span><span className="font-medium">{category?.name ?? "Nueva categoría"}</span></div></div><div className="sticky bottom-0 -mx-6 border-t border-[#e5e9e4] bg-[#fbfcf8] px-6 pt-4 sm:-mx-8 sm:px-8"><button type="submit" disabled={saving || !icon.trim()} className="h-12 w-full rounded-xl bg-[#17231e] text-sm font-semibold text-white disabled:opacity-50">{saving ? "Guardando…" : category ? "Guardar cambios" : "Crear categoría"}</button></div></form></Modal>;
}
