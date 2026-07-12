"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  formatGrade,
  summarizeGrades,
  type SubjectStatus,
} from "@/lib/grades";
import type { Evaluation } from "@/lib/types";

const STATUS_META: Record<
  SubjectStatus,
  { label: string; classes: string }
> = {
  aprobada: {
    label: "Aprobada",
    classes: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },
  en_riesgo: {
    label: "En curso",
    classes: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
  perdida: {
    label: "Perdida matemáticamente",
    classes: "border-red-500/30 bg-red-500/10 text-red-300",
  },
};

type Draft = { name: string; weight: string; grade: string };

const EMPTY_DRAFT: Draft = { name: "", weight: "", grade: "" };

export function EvaluationsClient({
  subjectId,
  userId,
  initialEvaluations,
}: {
  subjectId: string;
  userId: string;
  initialEvaluations: Evaluation[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [evaluations, setEvaluations] = useState(initialEvaluations);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simGrade, setSimGrade] = useState(3.5);

  const summary = useMemo(() => summarizeGrades(evaluations), [evaluations]);
  const totalWeight = useMemo(
    () => evaluations.reduce((s, e) => s + e.weight_percent, 0),
    [evaluations]
  );

  function parseDraft(d: Draft): {
    name: string;
    weight_percent: number;
    grade: number | null;
  } | null {
    const name = d.name.trim();
    const weight = Number(d.weight.replace(",", "."));
    if (!name) {
      setError("El nombre es obligatorio.");
      return null;
    }
    if (!Number.isFinite(weight) || weight <= 0 || weight > 100) {
      setError("El porcentaje debe estar entre 0 y 100.");
      return null;
    }
    let grade: number | null = null;
    if (d.grade.trim() !== "") {
      grade = Number(d.grade.replace(",", "."));
      if (!Number.isFinite(grade) || grade < 0 || grade > 5) {
        setError("La nota debe estar entre 0.0 y 5.0.");
        return null;
      }
    }
    return { name, weight_percent: weight, grade };
  }

  async function addEvaluation() {
    const parsed = parseDraft(draft);
    if (!parsed) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("evaluations")
      .insert({ ...parsed, subject_id: subjectId, user_id: userId })
      .select()
      .single();
    setBusy(false);
    if (err) {
      setError("No se pudo guardar la evaluación.");
      return;
    }
    setEvaluations((prev) => [...prev, data as Evaluation]);
    setDraft(EMPTY_DRAFT);
  }

  function startEdit(ev: Evaluation) {
    setEditingId(ev.id);
    setError(null);
    setEditDraft({
      name: ev.name,
      weight: String(ev.weight_percent),
      grade: ev.grade === null ? "" : String(ev.grade),
    });
  }

  async function saveEdit(id: string) {
    const parsed = parseDraft(editDraft);
    if (!parsed) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("evaluations")
      .update(parsed)
      .eq("id", id)
      .select()
      .single();
    setBusy(false);
    if (err) {
      setError("No se pudo actualizar la evaluación.");
      return;
    }
    setEvaluations((prev) =>
      prev.map((e) => (e.id === id ? (data as Evaluation) : e))
    );
    setEditingId(null);
  }

  async function removeEvaluation(id: string) {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase
      .from("evaluations")
      .delete()
      .eq("id", id);
    setBusy(false);
    if (err) {
      setError("No se pudo eliminar la evaluación.");
      return;
    }
    setEvaluations((prev) => prev.filter((e) => e.id !== id));
  }

  const inputClasses =
    "rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-indigo-400/60";

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
      {/* Columna izquierda: evaluaciones */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Evaluaciones
          </h2>
          <span
            className={`text-xs ${
              Math.abs(totalWeight - 100) < 0.01
                ? "text-zinc-500"
                : "text-amber-400"
            }`}
          >
            {totalWeight}% de 100% definido
          </span>
        </div>

        {evaluations.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-zinc-500">
            Agrega las evaluaciones de la materia (parciales, quices,
            trabajos) con su porcentaje.
          </p>
        ) : (
          <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
            {evaluations.map((ev) =>
              editingId === ev.id ? (
                <li key={ev.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                  <input
                    value={editDraft.name}
                    onChange={(e) =>
                      setEditDraft({ ...editDraft, name: e.target.value })
                    }
                    className={`${inputClasses} min-w-0 flex-1`}
                  />
                  <input
                    value={editDraft.weight}
                    onChange={(e) =>
                      setEditDraft({ ...editDraft, weight: e.target.value })
                    }
                    placeholder="%"
                    className={`${inputClasses} w-16 text-center`}
                  />
                  <input
                    value={editDraft.grade}
                    onChange={(e) =>
                      setEditDraft({ ...editDraft, grade: e.target.value })
                    }
                    placeholder="Nota"
                    className={`${inputClasses} w-16 text-center`}
                  />
                  <button
                    onClick={() => saveEdit(ev.id)}
                    disabled={busy}
                    className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    disabled={busy}
                    className="rounded-lg px-2 py-2 text-xs text-zinc-400 transition hover:text-white"
                  >
                    Cancelar
                  </button>
                </li>
              ) : (
                <li
                  key={ev.id}
                  className="group flex items-center gap-4 px-5 py-3.5 transition hover:bg-white/[0.03]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {ev.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {ev.weight_percent}% de la nota final
                    </p>
                  </div>
                  <span
                    className={`w-14 text-right text-lg font-bold tabular-nums ${
                      ev.grade === null
                        ? "text-zinc-600"
                        : ev.grade >= 3
                          ? "text-emerald-400"
                          : "text-red-400"
                    }`}
                  >
                    {ev.grade === null ? "—" : formatGrade(ev.grade)}
                  </span>
                  <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => startEdit(ev)}
                      className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-white/25 hover:text-white"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => removeEvaluation(ev.id)}
                      disabled={busy}
                      className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-red-500/40 hover:text-red-400"
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              )
            )}
          </ul>
        )}

        {/* Agregar nueva */}
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Nombre (ej. Primer parcial)"
            className={`${inputClasses} min-w-0 flex-1`}
          />
          <input
            value={draft.weight}
            onChange={(e) => setDraft({ ...draft, weight: e.target.value })}
            placeholder="%"
            className={`${inputClasses} w-16 text-center`}
          />
          <input
            value={draft.grade}
            onChange={(e) => setDraft({ ...draft, grade: e.target.value })}
            placeholder="Nota"
            className={`${inputClasses} w-16 text-center`}
          />
          <button
            onClick={addEvaluation}
            disabled={busy}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 disabled:opacity-50"
          >
            Agregar
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </p>
        )}
      </section>

      {/* Columna derecha: calculadora */}
      <aside className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Calculadora
        </h2>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <div className="flex items-baseline justify-between">
            <span className="text-4xl font-bold tabular-nums text-white">
              {formatGrade(summary.accumulated)}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${STATUS_META[summary.status].classes}`}
            >
              {STATUS_META[summary.status].label}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Nota acumulada · {summary.evaluatedPercent}% evaluado
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
              style={{ width: `${Math.min(100, summary.evaluatedPercent)}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="font-semibold tabular-nums text-white">
                {summary.currentAverage === null
                  ? "—"
                  : formatGrade(summary.currentAverage)}
              </p>
              <p className="text-xs text-zinc-500">Promedio actual</p>
            </div>
            <div>
              <p className="font-semibold tabular-nums text-white">
                {formatGrade(summary.maxAchievable)}
              </p>
              <p className="text-xs text-zinc-500">Máxima alcanzable</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <p className="mb-3 text-xs font-medium text-zinc-400">
            Necesitas en el {summary.remainingPercent}% restante:
          </p>
          <ul className="space-y-2">
            {summary.neededFor.map(({ target, needed, achieved }) => (
              <li
                key={target}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-zinc-400">
                  Para {formatGrade(target)}
                </span>
                {achieved ? (
                  <span className="text-xs font-medium text-emerald-400">
                    Ya asegurada
                  </span>
                ) : needed === null ? (
                  <span className="text-xs text-zinc-600">Inalcanzable</span>
                ) : (
                  <span
                    className={`font-semibold tabular-nums ${
                      needed > 5
                        ? "text-zinc-600"
                        : needed > 4
                          ? "text-amber-400"
                          : "text-white"
                    }`}
                  >
                    {formatGrade(needed)}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {summary.remainingPercent === 0 && (
            <p className="mt-3 text-xs text-zinc-500">
              Ya evaluaste el 100% de la materia. Nota final:{" "}
              <span className="font-semibold text-white">
                {formatGrade(summary.accumulated)}
              </span>
            </p>
          )}
        </div>

        {summary.remainingPercent > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
            <p className="mb-1 text-xs font-medium text-zinc-400">
              Simulador de escenarios
            </p>
            <p className="text-xs text-zinc-600">
              Si en el {summary.remainingPercent}% restante sacas...
            </p>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={5}
                step={0.1}
                value={simGrade}
                onChange={(e) => setSimGrade(Number(e.target.value))}
                className="flex-1 accent-indigo-500"
                aria-label="Nota hipotética en lo restante"
              />
              <span className="w-10 text-right text-lg font-bold tabular-nums text-white">
                {simGrade.toFixed(1)}
              </span>
            </div>
            {(() => {
              const projected =
                summary.accumulated +
                simGrade * (summary.remainingPercent / 100);
              return (
                <p className="mt-3 flex items-baseline justify-between text-sm">
                  <span className="text-zinc-400">Nota final proyectada</span>
                  <span
                    className={`text-xl font-bold tabular-nums ${
                      projected >= 3 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {formatGrade(projected)}
                  </span>
                </p>
              );
            })()}
          </div>
        )}
      </aside>
    </div>
  );
}
