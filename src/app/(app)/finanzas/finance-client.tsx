"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/types";
import type { Transaction } from "@/lib/types";

const CATEGORY_LABELS: Record<string, string> = {
  beca: "Beca",
  trabajo: "Trabajo",
  auxilio: "Auxilio",
  padres: "Padres",
  matricula: "Matrícula",
  transporte: "Transporte",
  alimentacion: "Alimentación",
  libros: "Libros",
  fotocopias: "Fotocopias",
  papeleria: "Papelería",
  materiales: "Materiales",
  software: "Software",
  internet: "Internet",
  impresiones: "Impresiones",
  otro: "Otro",
};

function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Draft = {
  type: "ingreso" | "gasto";
  category: string;
  amount: string;
  description: string;
  date: string;
};

export function FinanceClient({
  userId,
  semesterId,
  initialTransactions,
}: {
  userId: string;
  semesterId: string;
  initialTransactions: Transaction[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [draft, setDraft] = useState<Draft>({
    type: "gasto",
    category: "transporte",
    amount: "",
    description: "",
    date: toDateKey(new Date()),
  });
  const [filter, setFilter] = useState<"todos" | "ingreso" | "gasto">("todos");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const stats = useMemo(() => {
    const monthTx = transactions.filter((t) =>
      t.occurred_at.startsWith(monthKey)
    );
    const incomeMonth = monthTx
      .filter((t) => t.type === "ingreso")
      .reduce((s, t) => s + Number(t.amount), 0);
    const expenseMonth = monthTx
      .filter((t) => t.type === "gasto")
      .reduce((s, t) => s + Number(t.amount), 0);
    const balance = transactions.reduce(
      (s, t) => s + (t.type === "ingreso" ? 1 : -1) * Number(t.amount),
      0
    );
    return { incomeMonth, expenseMonth, balance };
  }, [transactions, monthKey]);

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== "gasto" || !t.occurred_at.startsWith(monthKey)) continue;
      map.set(t.category, (map.get(t.category) ?? 0) + Number(t.amount));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [transactions, monthKey]);

  const maxCategory = expensesByCategory[0]?.[1] ?? 0;

  async function addTransaction() {
    const amount = Number(draft.amount.replace(/[.,\s]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("El monto debe ser un número mayor que cero.");
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        semester_id: semesterId,
        type: draft.type,
        category: draft.category,
        amount,
        description: draft.description.trim() || null,
        occurred_at: draft.date,
      })
      .select()
      .single();
    setBusy(false);
    if (err) {
      setError("No se pudo registrar el movimiento.");
      return;
    }
    setTransactions((prev) => [data as Transaction, ...prev]);
    setDraft((d) => ({ ...d, amount: "", description: "" }));
  }

  async function removeTransaction(id: string) {
    const { error: err } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id);
    if (err) {
      setError("No se pudo eliminar el movimiento.");
      return;
    }
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }

  const categories =
    draft.type === "ingreso" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const visible =
    filter === "todos"
      ? transactions
      : transactions.filter((t) => t.type === filter);

  const inputClasses =
    "rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-indigo-400/60";

  return (
    <div className="mt-8 space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
          <p className="text-2xl font-bold tabular-nums text-emerald-400">
            {formatCOP(stats.incomeMonth)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Ingresos del mes</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
          <p className="text-2xl font-bold tabular-nums text-red-400">
            {formatCOP(stats.expenseMonth)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Gastos del mes</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
          <p
            className={`text-2xl font-bold tabular-nums ${
              stats.balance >= 0 ? "text-white" : "text-red-400"
            }`}
          >
            {formatCOP(stats.balance)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Balance total</p>
        </div>
      </div>

      {/* Registro */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-xl border border-white/10">
            {(["gasto", "ingreso"] as const).map((t) => (
              <button
                key={t}
                onClick={() =>
                  setDraft({
                    ...draft,
                    type: t,
                    category: t === "ingreso" ? "beca" : "transporte",
                  })
                }
                className={`px-3.5 py-2 text-sm font-medium transition ${
                  draft.type === t
                    ? t === "gasto"
                      ? "bg-red-500/20 text-red-300"
                      : "bg-emerald-500/20 text-emerald-300"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {t === "gasto" ? "Gasto" : "Ingreso"}
              </button>
            ))}
          </div>
          <select
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            className={inputClasses}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <input
            value={draft.amount}
            onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
            placeholder="Monto (COP)"
            inputMode="numeric"
            className={`${inputClasses} w-32`}
          />
          <input
            type="date"
            value={draft.date}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            className={`${inputClasses} [color-scheme:dark]`}
          />
          <input
            value={draft.description}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
            placeholder="Descripción (opcional)"
            className={`${inputClasses} min-w-0 flex-1`}
          />
          <button
            onClick={addTransaction}
            disabled={busy}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Guardando..." : "Registrar"}
          </button>
        </div>
        {error && (
          <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            {error}
          </p>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* Movimientos */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Movimientos
            </h2>
            <div className="flex gap-1">
              {(["todos", "ingreso", "gasto"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    filter === f
                      ? "bg-white text-zinc-900"
                      : "border border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"
                  }`}
                >
                  {f === "todos"
                    ? "Todos"
                    : f === "ingreso"
                      ? "Ingresos"
                      : "Gastos"}
                </button>
              ))}
            </div>
          </div>
          {visible.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-zinc-500">
              Sin movimientos todavía. Registra el primero arriba.
            </p>
          ) : (
            <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
              {visible.map((t) => (
                <li
                  key={t.id}
                  className="group flex items-center gap-4 px-5 py-3 transition hover:bg-white/[0.03]"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      t.type === "ingreso"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {t.type === "ingreso" ? "↑" : "↓"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {CATEGORY_LABELS[t.category] ?? t.category}
                      {t.description ? (
                        <span className="ml-1.5 font-normal text-zinc-500">
                          · {t.description}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(`${t.occurred_at}T12:00:00`).toLocaleDateString(
                        "es-CO",
                        { day: "numeric", month: "short", year: "numeric" }
                      )}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold tabular-nums ${
                      t.type === "ingreso"
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {t.type === "ingreso" ? "+" : "−"}
                    {formatCOP(Number(t.amount))}
                  </span>
                  <button
                    onClick={() => removeTransaction(t.id)}
                    aria-label="Eliminar movimiento"
                    className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-xs text-zinc-400 opacity-0 transition hover:border-red-500/40 hover:text-red-400 group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Gastos por categoría */}
        <aside>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Gastos del mes por categoría
          </h2>
          {expensesByCategory.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-zinc-500">
              Sin gastos este mes.
            </p>
          ) : (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              {expensesByCategory.map(([category, total]) => (
                <div key={category}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                    <span className="text-zinc-400">
                      {CATEGORY_LABELS[category] ?? category}
                    </span>
                    <span className="font-semibold tabular-nums text-white">
                      {formatCOP(total)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                      style={{ width: `${(total / maxCategory) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
