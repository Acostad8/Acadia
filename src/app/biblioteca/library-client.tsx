"use client";

import { useMemo, useState } from "react";
import { SUBJECT_SUBFOLDERS } from "@/lib/doc-types";
import { suggestDocType, suggestSubject } from "@/lib/classify";
import type { Document, Subject } from "@/lib/types";

type PendingFile = {
  file: File;
  subjectId: string;
  docType: string;
  analyzing?: boolean;
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
  const [search, setSearch] = useState("");
  const [moving, setMoving] = useState<{
    doc: Document;
    subjectId: string;
    docType: string;
  } | null>(null);

  const subjectById = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects]
  );

  async function pickFile(file: File) {
    setError(null);
    const byFilename = suggestSubject(file.name, subjects);
    const initial: PendingFile = {
      file,
      subjectId: byFilename?.id ?? "",
      docType: suggestDocType(file.name),
    };

    // Sin match por nombre y es PDF: analizar contenido en el servidor
    if (!byFilename && file.type === "application/pdf") {
      setPending({ ...initial, analyzing: true });
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/documents/suggest", {
          method: "POST",
          body: form,
        });
        if (res.ok) {
          const json = await res.json();
          setPending({
            file,
            subjectId: json.subject_id ?? "",
            docType: json.doc_type ?? initial.docType,
          });
          return;
        }
      } catch {
        // Análisis falló: el usuario selecciona manualmente
      }
      setPending(initial);
      return;
    }

    setPending(initial);
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

  async function moveDocument() {
    if (!moving) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/documents/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: moving.doc.id,
          subject_id: moving.subjectId,
          doc_type: moving.docType,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al mover");
      setDocuments((prev) =>
        prev.map((d) => (d.id === moving.doc.id ? (json as Document) : d))
      );
      setMoving(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setBusy(false);
    }
  }

  const query = search.trim().toLowerCase();
  const visible = documents.filter((d) => {
    if (filter && d.subject_id !== filter) return false;
    if (!query) return true;
    return (
      d.name.toLowerCase().includes(query) ||
      (d.doc_type ?? "").toLowerCase().includes(query) ||
      d.tags.some((t) => t.toLowerCase().includes(query))
    );
  });

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
            {(pending.file.size / 1024 / 1024).toFixed(2)} MB ·{" "}
            {pending.analyzing
              ? "Analizando contenido del documento..."
              : pending.subjectId
                ? "Confirma la clasificación sugerida"
                : "No se detectó la materia — selecciónala"}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <select
              value={pending.subjectId}
              onChange={(e) =>
                setPending({ ...pending, subjectId: e.target.value })
              }
              className={`rounded-xl border px-3 py-2 text-sm text-white outline-none focus:border-indigo-400/60 ${
                pending.subjectId
                  ? "border-white/10 bg-zinc-900"
                  : "border-amber-500/40 bg-zinc-900"
              }`}
            >
              <option value="" disabled>
                Selecciona materia...
              </option>
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
                disabled={busy || !pending.subjectId || !driveReady || pending.analyzing}
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

      {/* Búsqueda */}
      {documents.length > 0 && (
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, tipo o etiqueta..."
          className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-indigo-400/60"
        />
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
            : query
              ? "Sin resultados para tu búsqueda."
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
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() =>
                      setMoving({
                        doc: d,
                        subjectId: d.subject_id ?? "",
                        docType: d.doc_type ?? SUBJECT_SUBFOLDERS[0],
                      })
                    }
                    title="Mover a otra materia o carpeta"
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-indigo-400/50 hover:text-white"
                  >
                    Mover
                  </button>
                  {d.drive_web_link && (
                    <a
                      href={d.drive_web_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
                    >
                      Abrir en Drive
                    </a>
                  )}
                  {d.drive_folder_id && (
                    <a
                      href={`https://drive.google.com/drive/folders/${d.drive_folder_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir la carpeta que contiene este archivo"
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
                    >
                      Abrir carpeta
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Modal mover documento */}
      {moving && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => !busy && setMoving(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">
              Mover documento
            </h3>
            <p className="mt-1 truncate text-sm text-zinc-500">
              {moving.doc.name}
            </p>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs text-zinc-500">
                  Materia destino
                </span>
                <select
                  value={moving.subjectId}
                  onChange={(e) =>
                    setMoving({ ...moving, subjectId: e.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400/60"
                >
                  <option value="" disabled>
                    Selecciona materia...
                  </option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-zinc-500">
                  Carpeta / tipo
                </span>
                <select
                  value={moving.docType}
                  onChange={(e) =>
                    setMoving({ ...moving, docType: e.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400/60"
                >
                  {SUBJECT_SUBFOLDERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-3 text-xs text-zinc-600">
              El archivo también se moverá a la carpeta correspondiente en tu
              Google Drive.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setMoving(null)}
                disabled={busy}
                className="rounded-xl px-4 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={moveDocument}
                disabled={busy || !moving.subjectId}
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 disabled:opacity-50"
              >
                {busy ? "Moviendo..." : "Mover"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
