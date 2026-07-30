"use client";

import { useFinance } from "./finance-provider";

export function CategoriesPage() {
  const { state } = useFinance();
  return <section><div className="mb-7"><h2 className="text-2xl font-semibold tracking-tight">Categorías</h2><p className="mt-1 text-sm text-[#5e6d63]">Organiza y entiende en qué se mueve tu dinero.</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{state.categories.map((category) => { const count = state.transactions.filter((item) => item.categoryId === category.id).length; return <div key={category.id} className="flex items-center gap-4 rounded-2xl border border-[#e0e4dd] bg-white p-5"><span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-xl text-lg text-white" style={{ backgroundColor: category.color }}>{category.icon}</span><div><p className="font-medium">{category.name}</p><p className="mt-1 text-xs text-[#5e6d63]">{count} movimientos</p></div></div>; })}</div></section>;
}
