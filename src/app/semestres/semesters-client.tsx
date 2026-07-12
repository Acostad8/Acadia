"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Semester } from "@/lib/types";

export function SemestersClient({
  initialSemesters,
  subjectCounts,
}: {
  initialSemesters: Semester[];
  subjectCounts: Record<string, number>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [semesters, setSemesters] = useState(initialSemesters);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = semesters.filter((s) => !s.archived);
  const archived = semesters.filter((s) => s.archived);

  async function makeCurrent(id: string) {
    setBusyId(id);
    setError(null);
    // Primero desmarcar el actual, luego marcar el nuevo
    const { error: clearErr } = await supabase
      .from("semesters")
      .update({ is_current: false })
      .eq("is_current", true);
    if (clearErr) {
      setBusyId(null);
      setError("No se pudo cambiar el semestre actual.");
      return;
    }
    const { error: setErr } = await supabase
      .from("semesters")
      .update({ is_current: true, archived: false })
      .eq("id", id);
    setBusyId(null);
    if (setErr) {
      setError("No se pudo cambiar el semestre actual.");
      return;
    }
    setSemesters((prev) =>
      prev.map((s) => ({
        ...s,
        is_current: s.id === id,
        archived: s.id === id ? false : s.archived,
      }))
    );
    router.refresh();
  }

  async function setArchived(id: string, value: boolean) {
    setBusyId(id);
    setError(null);
    const { error: err } = await supabase
      .from("semesters")
      .update({ archived: value, ...(value ? { is_current: false } : {}) })
      .eq("id", id);
    setBusyId(null);
    if (err) {
      setError(
        value
          ? "No se pudo archivar el semestre."
          : "No se pudo restaurar el semestre."
      );
      return;
    }
    setSemesters((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, archived: value, is_current: value ? false : s.is_current }
          : s
      )
    );
    router.refresh();
  }

  function SemesterRow({ s }: { s: Semester }) {
    const count = subjectCounts[s.id] ?? 0;
    return (
      <li className="flex flex-wrap items-center gap-3 px-5 py-4 transition hover:bg-white/[0.03]">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            {s.label ?? s.name}
            {s.is_current && (
              <span className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                Actual
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {count} materia{count === 1 ? "" : "s"}
            {" · creado "}
            {new Date(s.created_at).toLocaleDateString("es-CO", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {!s.is_current && !s.archived && (
            <button
              onClick={() => makeCurrent(s.id)}
              disabled={busyId !== null}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-indigo-400/50 hover:text-white disabled:opacity-50"
            >
              {busyId === s.id ? "Cambiando..." : "Hacer actual"}
            </button>
          )}
          {s.archived ? (
            <button
              onClick={() => setArchived(s.id, false)}
              disabled={busyId !== null}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/25 hover:text-white disabled:opacity-50"
            >
              {busyId === s.id ? "Restaurando..." : "Restaurar"}
            </button>
          ) : (
            !s.is_current && (
              <button
                onClick={() => setArchived(s.id, true)}
                disabled={busyId !== null}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:border-amber-500/40 hover:text-amber-300 disabled:opacity-50"
              >
                {busyId === s.id ? "Archivando..." : "Archivar"}
              </button>
            )
          )}
        </div>
      </li>
    );
  }

  return (
    <div className="mt-8 space-y-8">
      {error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {active.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-zinc-500">
          No hay semestres activos. Crea uno desde «+ Nuevo semestre».
        </p>
      ) : (
        <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          {active.map((s) => (
            <SemesterRow key={s.id} s={s} />
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Archivados
          </h2>
          <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] opacity-70">
            {archived.map((s) => (
              <SemesterRow key={s.id} s={s} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
