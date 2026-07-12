"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SubjectNotes({
  subjectId,
  initialNotes,
}: {
  subjectId: string;
  initialNotes: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saved, setSaved] = useState(initialNotes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = notes !== saved;

  async function save() {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase
      .from("subjects")
      .update({ notes: notes.trim() || null })
      .eq("id", subjectId);
    setBusy(false);
    if (err) {
      setError("No se pudieron guardar los apuntes.");
      return;
    }
    setSaved(notes);
  }

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Apuntes rápidos
        </h2>
        {dirty && (
          <button
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Guardando..." : "Guardar"}
          </button>
        )}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => dirty && save()}
        placeholder="Temas pendientes, acuerdos con el profesor, fechas dichas en clase, ideas..."
        rows={4}
        className="w-full resize-y rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm leading-relaxed text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-indigo-400/50"
      />
      {error && (
        <p className="mt-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}
