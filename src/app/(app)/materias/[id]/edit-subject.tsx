"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Subject } from "@/lib/types";

const PALETTE = [
  "#6366f1",
  "#8b5cf6",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#ec4899",
];

export function EditSubject({ subject }: { subject: Subject }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(subject.name);
  const [credits, setCredits] = useState(
    subject.credits === null ? "" : String(subject.credits)
  );
  const [professor, setProfessor] = useState(subject.professor ?? "");
  const [color, setColor] = useState(subject.color ?? PALETTE[0]);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("El nombre es obligatorio.");
      return;
    }
    let creditsValue: number | null = null;
    if (credits.trim() !== "") {
      creditsValue = Number(credits);
      if (!Number.isInteger(creditsValue) || creditsValue < 0 || creditsValue > 20) {
        setError("Los créditos deben ser un entero entre 0 y 20.");
        return;
      }
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase
      .from("subjects")
      .update({
        name: trimmed,
        credits: creditsValue,
        professor: professor.trim() || null,
        color,
      })
      .eq("id", subject.id);
    setBusy(false);
    if (err) {
      setError("No se pudo guardar la materia.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  const inputClasses =
    "rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-indigo-400/60";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
      >
        Editar
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">
              Editar materia
            </h3>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs text-zinc-500">
                  Nombre
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`${inputClasses} w-full`}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs text-zinc-500">
                    Créditos
                  </span>
                  <input
                    value={credits}
                    onChange={(e) => setCredits(e.target.value)}
                    placeholder="—"
                    className={`${inputClasses} w-full`}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-zinc-500">
                    Profesor
                  </span>
                  <input
                    value={professor}
                    onChange={(e) => setProfessor(e.target.value)}
                    placeholder="—"
                    className={`${inputClasses} w-full`}
                  />
                </label>
              </div>
              <div>
                <span className="mb-1.5 block text-xs text-zinc-500">
                  Color
                </span>
                <div className="flex flex-wrap gap-2">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      aria-label={`Color ${c}`}
                      className={`h-8 w-8 rounded-full transition ${
                        color === c
                          ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950"
                          : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                {error}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded-xl px-4 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={busy}
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 disabled:opacity-50"
              >
                {busy ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
