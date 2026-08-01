"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Category } from "@/lib/finance";
import { Modal } from "@/components/modal";
import { TransactionList } from "./transaction-list";
import { useFinance } from "./finance-provider";

const fieldClass = "mt-2 h-11 w-full rounded-xl border border-[#dce1da] bg-white px-3 text-sm outline-none focus:border-[#526b5e] focus:ring-2 focus:ring-[#526b5e]/10";

export function CategoriesPage() {
  const { state, createCategory, updateCategory, deleteCategory, saving } = useFinance();
  const [selected, setSelected] = useState<Category | null>(null);
  const [editing, setEditing] = useState<Category | "new" | null>(null);

  async function saveCategory(category: Category) {
    const ok = editing === "new" ? await createCategory(category) : await updateCategory(category);
    if (ok) { setEditing(null); setSelected(category); }
  }

  async function removeCategory(category: Category) {
    if (!window.confirm(`¿Eliminar la categoría “${category.name}”?`)) return;
    if (await deleteCategory(category.id)) { setSelected(null); setEditing(null); }
  }

  return <section>
    <div className="mb-7 flex items-center justify-between gap-3">
      <p className="max-w-xl text-sm text-[#5e6d63]">Organiza tus movimientos por tipo y abre cada categoría para ver su historial.</p>
      <button type="button" onClick={() => setEditing("new")} className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[#17231e] px-4 text-sm font-semibold text-white"><Plus size={16} aria-hidden="true" /><span className="hidden sm:inline">Nueva categoría</span></button>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {state.categories.map((category) => {
        const count = state.transactions.filter((item) => item.categoryId === category.id).length;
        return <button key={category.id} type="button" onClick={() => setSelected(category)} className="flex items-center gap-4 rounded-2xl border border-[#e0e4dd] bg-white p-5 text-left hover:border-[#cbd5cc] hover:shadow-[0_10px_26px_rgba(23,35,30,.06)]">
          <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-xl text-lg text-white" style={{ backgroundColor: category.color }}>{category.icon}</span>
          <span className="min-w-0"><span className="block truncate font-medium">{category.name}</span><span className="mt-1 block text-xs text-[#5e6d63]">{count} {count === 1 ? "movimiento" : "movimientos"}</span></span>
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
