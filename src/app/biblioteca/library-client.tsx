"use client";

import { useMemo, useState } from "react";
import { SUBJECT_SUBFOLDERS } from "@/lib/doc-types";
import { suggestDocType, suggestSubject } from "@/lib/classify";
import type { Document, Subject } from "@/lib/types";

type PendingFile = {
  file: File;
  subjectId: string;
  docType: string;
};

export function LibraryClient({
  subjects,
  initialDocuments,
  driveReady,
}: {
  subjects: Subject[];
  initialDocuments: Document[];
  driveReady: boolean;
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [pending, setPending] = useState<PendingFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  const subjectById = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects]
  );

  function pickFile(file: File) {
    setError(null);
    const suggested = suggestSubject(file.name, subjects);
    setPending({
      file,
      subjectId: suggested?.id ?? subjects[0]?.id ?? "",
      docType: suggestDocType(file.name),
    });
  }

  async function upload() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", pending.file);
      form.append("subject_id", pending.subjectId);
      form.append("doc_type", pending.docType);
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al subir");
      setDocuments((prev) => [json as Document, ...prev]);
      setPending(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setBusy(false);
    }
  }

  const visible = filter
    ? documents.filter((d) => d.subject_id === filter)
    : documents;

  return (
    <div className="mt-8 space-y-8">
      {!driveReady && (
        <p className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-300">
          Primero crea las carpetas de Drive desde el dashboard para poder
          subir documentos.
        </p>
      )}

      {/* Zona de carga */}
      {!pending && (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) pickFile(f);
          }}
          className={`flex h-36 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed transition-all ${
            dragging
              ? "border-indigo-400 bg-indigo-500/10"
              : "border-white/15 bg-white/[0.03] hover:border-indigo-400/50 hover:bg-white/[0.05]"
          }`}
        >
          <span className="text-sm font-semibold text-white">
            Arrastra un documento aquí o haz clic
          </span>
          <span className="mt-1 text-xs text-zinc-500">
            Acadia detecta la materia y el tipo automáticamente
          </span>
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
              e.target.value = "";
            }}
          />
        </label>
      )}

      {/* Confirmación de clasificación */}
      {pending && (
        <div className="rounded-2xl border border-indigo-400/30 bg-indigo-500/[0.06] p-5 backdrop-blur-sm">
          <p className="truncate text-sm font-semibold text-white">
            {pending.file.name}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {(pending.file.size / 1024 / 1024).toFixed(2)} MB · Confirma la
            clasificación sugerida
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <select
              value={pending.subjectId}
              onChange={(e) =>
                setPending({ ...pending, subjectId: e.target.value })
              }
              className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400/60"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={pending.docType}
              onChange={(e) =>
                setPending({ ...pending, docType: e.target.value })
              }
              className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400/60"
            >
              {SUBJECT_SUBFOLDERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => setPending(null)}
                disabled={busy}
                className="rounded-xl px-4 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={upload}
                disabled={busy || !pending.subjectId || !driveReady}
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 disabled:opacity-50"
              >
                {busy ? "Subiendo a Drive..." : "Subir a Drive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* Filtros */}
      {subjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter(null)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              filter === null
                ? "bg-white text-zinc-900"
                : "border border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"
            }`}
          >
            Todas
          </button>
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => setFilter(filter === s.id ? null : s.id)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                filter === s.id
                  ? "bg-white text-zinc-900"
                  : "border border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: s.color ?? "#6366f1" }}
              />
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Lista de documentos */}
      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-zinc-500">
          {documents.length === 0
            ? "Aún no hay documentos. Sube el primero."
            : "Sin documentos para este filtro."}
        </p>
      ) : (
        <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          {visible.map((d) => {
            const subject = d.subject_id
              ? subjectById.get(d.subject_id)
              : undefined;
            return (
              <li
                key={d.id}
                className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-white/[0.03]"
              >
                <span
                  className="h-8 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: subject?.color ?? "#3f3f46" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {d.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {subject?.name ?? "Sin materia"}
                    {d.doc_type ? ` · ${d.doc_type}` : ""}
                    {" · "}
                    {new Date(d.uploaded_at).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                {d.drive_web_link && (
                  <a
                    href={d.drive_web_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
                  >
                    Abrir en Drive
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
