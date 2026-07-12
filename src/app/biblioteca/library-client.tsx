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

type SortMode = "recent" | "name" | "size";
type ViewMode = "grid" | "list";

function formatSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "";
}

type FileKind = "pdf" | "doc" | "sheet" | "slide" | "image" | "video" | "audio" | "archive" | "code" | "other";

function fileKind(name: string, mime: string | null | undefined): FileKind {
  const ext = extOf(name);
  const m = (mime ?? "").toLowerCase();
  if (m.includes("pdf") || ext === "pdf") return "pdf";
  if (m.includes("wordprocessing") || ["doc", "docx", "odt", "rtf", "txt", "md"].includes(ext)) return "doc";
  if (m.includes("spreadsheet") || ["xls", "xlsx", "ods", "csv"].includes(ext)) return "sheet";
  if (m.includes("presentation") || ["ppt", "pptx", "odp", "key"].includes(ext)) return "slide";
  if (m.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return "image";
  if (m.startsWith("video/") || ["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) return "video";
  if (m.startsWith("audio/") || ["mp3", "wav", "m4a", "ogg", "flac"].includes(ext)) return "audio";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "archive";
  if (["js", "ts", "tsx", "jsx", "py", "java", "c", "cpp", "cs", "html", "css", "json", "sql"].includes(ext)) return "code";
  return "other";
}

const KIND_STYLE: Record<FileKind, { bg: string; text: string; label: string }> = {
  pdf: { bg: "bg-red-500/10", text: "text-red-300", label: "PDF" },
  doc: { bg: "bg-sky-500/10", text: "text-sky-300", label: "DOC" },
  sheet: { bg: "bg-emerald-500/10", text: "text-emerald-300", label: "XLS" },
  slide: { bg: "bg-amber-500/10", text: "text-amber-300", label: "PPT" },
  image: { bg: "bg-fuchsia-500/10", text: "text-fuchsia-300", label: "IMG" },
  video: { bg: "bg-rose-500/10", text: "text-rose-300", label: "VID" },
  audio: { bg: "bg-teal-500/10", text: "text-teal-300", label: "AUD" },
  archive: { bg: "bg-orange-500/10", text: "text-orange-300", label: "ZIP" },
  code: { bg: "bg-violet-500/10", text: "text-violet-300", label: "CODE" },
  other: { bg: "bg-white/10", text: "text-zinc-300", label: "DOC" },
};

function FileIcon({ kind, className = "h-5 w-5" }: { kind: FileKind; className?: string }) {
  if (kind === "image") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="9" cy="10" r="1.5" fill="currentColor" />
        <path d="m4 18 5-5 4 4 3-3 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "video") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="3" y="5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="m21 8-4 3v2l4 3V8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "audio") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M9 18V6l11-2v12" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="17" cy="16" r="3" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (kind === "archive") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 3v6m0 3v2m0 3v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "code") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="m8 8-5 4 5 4m8-8 5 4-5 4m-2-11-4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 3h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M15 3v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

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
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");
  const [view, setView] = useState<ViewMode>("grid");
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
        // fallback manual
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
  const filtered = useMemo(() => {
    const base = documents.filter((d) => {
      if (filter && d.subject_id !== filter) return false;
      if (typeFilter && d.doc_type !== typeFilter) return false;
      if (!query) return true;
      return (
        d.name.toLowerCase().includes(query) ||
        (d.doc_type ?? "").toLowerCase().includes(query) ||
        d.tags.some((t) => t.toLowerCase().includes(query))
      );
    });
    const sorted = [...base];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "size")
      sorted.sort((a, b) => (b.size_bytes ?? 0) - (a.size_bytes ?? 0));
    else
      sorted.sort(
        (a, b) =>
          new Date(b.uploaded_at).getTime() -
          new Date(a.uploaded_at).getTime()
      );
    return sorted;
  }, [documents, filter, typeFilter, query, sort]);

  const totalSize = documents.reduce((s, d) => s + (d.size_bytes ?? 0), 0);
  const orphanCount = documents.filter((d) => !d.subject_id).length;
  const typeCounts = useMemo(() => {
    const m = new Map<string, number>();
    documents.forEach((d) => {
      if (d.doc_type) m.set(d.doc_type, (m.get(d.doc_type) ?? 0) + 1);
    });
    return m;
  }, [documents]);
  const dominantType = useMemo(() => {
    let best: { name: string; count: number } | null = null;
    typeCounts.forEach((count, name) => {
      if (!best || count > best.count) best = { name, count };
    });
    return best as { name: string; count: number } | null;
  }, [typeCounts]);

  return (
    <div className="mt-8 space-y-6">
      {!driveReady && (
        <p className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-300">
          Primero crea las carpetas de Drive desde el dashboard para poder
          subir documentos.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Documentos",
            value: documents.length,
            tint: "text-indigo-300 bg-indigo-500/10",
          },
          {
            label: "Almacenamiento",
            value: formatSize(totalSize),
            tint: "text-emerald-300 bg-emerald-500/10",
          },
          {
            label: "Tipo principal",
            value: dominantType?.name ?? "—",
            hint: dominantType ? `${dominantType.count} archivos` : undefined,
            tint: "text-amber-300 bg-amber-500/10",
          },
          {
            label: "Sin materia",
            value: orphanCount,
            tint:
              orphanCount > 0
                ? "text-red-300 bg-red-500/10"
                : "text-zinc-400 bg-white/5",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm"
          >
            <p className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${s.tint}`}>
              {s.label}
            </p>
            <p className="mt-2 truncate text-xl font-bold text-white">
              {s.value}
            </p>
            {s.hint && (
              <p className="mt-0.5 text-[11px] text-zinc-500">{s.hint}</p>
            )}
          </div>
        ))}
      </div>

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
          className={`group relative flex h-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed transition-all ${
            dragging
              ? "border-indigo-400 bg-indigo-500/10"
              : "border-white/15 bg-white/[0.03] hover:border-indigo-400/50 hover:bg-white/[0.05]"
          }`}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100"
          >
            <div className="absolute -left-10 top-0 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="absolute -right-10 bottom-0 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />
          </div>
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 text-indigo-300 ring-1 ring-inset ring-white/10">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
              <path
                d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="relative mt-3 text-sm font-semibold text-white">
            Arrastra un documento aquí o haz clic
          </span>
          <span className="relative mt-1 text-xs text-zinc-500">
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

      {pending && (
        <div className="rounded-2xl border border-indigo-400/30 bg-indigo-500/[0.06] p-5 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${KIND_STYLE[fileKind(pending.file.name, pending.file.type)].bg} ${KIND_STYLE[fileKind(pending.file.name, pending.file.type)].text}`}
            >
              <FileIcon kind={fileKind(pending.file.name, pending.file.type)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {pending.file.name}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {formatSize(pending.file.size)} ·{" "}
                {pending.analyzing ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
                    Analizando contenido del documento...
                  </span>
                ) : pending.subjectId ? (
                  "Confirma la clasificación sugerida"
                ) : (
                  <span className="text-amber-300">
                    No se detectó la materia — selecciónala
                  </span>
                )}
              </p>
            </div>
          </div>
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
                disabled={
                  busy ||
                  !pending.subjectId ||
                  !driveReady ||
                  pending.analyzing
                }
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

      {documents.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3 backdrop-blur-sm sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, tipo o etiqueta..."
              className="w-full rounded-xl border border-white/5 bg-zinc-900/60 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-indigo-400/60"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400/60"
              title="Ordenar"
            >
              <option value="recent">Más recientes</option>
              <option value="name">Por nombre</option>
              <option value="size">Por tamaño</option>
            </select>
            <div className="flex rounded-xl border border-white/10 bg-zinc-900 p-0.5">
              <button
                onClick={() => setView("grid")}
                title="Vista de tarjetas"
                className={`rounded-lg px-2 py-1.5 transition ${
                  view === "grid"
                    ? "bg-white/10 text-white"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
              <button
                onClick={() => setView("list")}
                title="Vista de lista"
                className={`rounded-lg px-2 py-1.5 transition ${
                  view === "list"
                    ? "bg-white/10 text-white"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {(subjects.length > 0 || documents.length > 0) && (
        <div className="space-y-2">
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
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setTypeFilter(null)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                typeFilter === null
                  ? "bg-indigo-500/20 text-indigo-200"
                  : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
              }`}
            >
              Todos los tipos
            </button>
            {SUBJECT_SUBFOLDERS.map((t) => {
              const count = typeCounts.get(t) ?? 0;
              if (count === 0) return null;
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                    typeFilter === t
                      ? "bg-indigo-500/20 text-indigo-200"
                      : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                  }`}
                >
                  {t} <span className="text-zinc-600">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {documents.length > 0 && (
        <p className="text-[11px] text-zinc-500">
          Mostrando <span className="text-zinc-300">{filtered.length}</span> de{" "}
          {documents.length} documentos
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] text-zinc-500">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
              <path
                d="M4 5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-sm text-zinc-400">
            {documents.length === 0
              ? "Aún no hay documentos. Sube el primero."
              : query
                ? "Sin resultados para tu búsqueda."
                : "Sin documentos para este filtro."}
          </p>
          {(filter || typeFilter || query) && documents.length > 0 && (
            <button
              onClick={() => {
                setFilter(null);
                setTypeFilter(null);
                setSearch("");
              }}
              className="mt-3 text-xs font-medium text-indigo-400 hover:text-indigo-300"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : view === "grid" ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => {
            const subject = d.subject_id ? subjectById.get(d.subject_id) : undefined;
            const kind = fileKind(d.name, d.mime_type);
            const style = KIND_STYLE[kind];
            return (
              <li
                key={d.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.05]"
              >
                <span
                  className="absolute inset-x-0 top-0 h-0.5"
                  style={{ backgroundColor: subject?.color ?? "#3f3f46" }}
                />
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.bg} ${style.text}`}>
                    <FileIcon kind={kind} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 break-words text-sm font-semibold text-white">
                      {d.name}
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {subject?.name ?? "Sin materia"}
                      {d.doc_type ? ` · ${d.doc_type}` : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-[10px] font-medium">
                  <span className={`rounded px-1.5 py-0.5 ${style.bg} ${style.text}`}>
                    {style.label}
                  </span>
                  <span className="text-zinc-500">{formatSize(d.size_bytes)}</span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-500">
                    {new Date(d.uploaded_at).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
                <div className="mt-4 flex gap-1.5">
                  {d.drive_web_link && (
                    <a
                      href={d.drive_web_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-center text-[11px] font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
                    >
                      Abrir
                    </a>
                  )}
                  {d.drive_folder_id && (
                    <a
                      href={`https://drive.google.com/drive/folders/${d.drive_folder_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir carpeta"
                      className="rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 transition hover:bg-white/10 hover:text-white"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </a>
                  )}
                  <button
                    onClick={() =>
                      setMoving({
                        doc: d,
                        subjectId: d.subject_id ?? "",
                        docType: d.doc_type ?? SUBJECT_SUBFOLDERS[0],
                      })
                    }
                    title="Mover"
                    className="rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 transition hover:bg-white/10 hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                      <path d="M14 5h5v5m0-5-9 9m-4 5H4v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          {filtered.map((d) => {
            const subject = d.subject_id ? subjectById.get(d.subject_id) : undefined;
            const kind = fileKind(d.name, d.mime_type);
            const style = KIND_STYLE[kind];
            return (
              <li
                key={d.id}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03]"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.bg} ${style.text}`}>
                  <FileIcon kind={kind} className="h-4 w-4" />
                </div>
                <span
                  className="h-8 w-0.5 shrink-0 rounded-full"
                  style={{ backgroundColor: subject?.color ?? "#3f3f46" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {d.name}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {subject?.name ?? "Sin materia"}
                    {d.doc_type ? ` · ${d.doc_type}` : ""}
                    {" · "}
                    {formatSize(d.size_bytes)}
                    {" · "}
                    {new Date(d.uploaded_at).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() =>
                      setMoving({
                        doc: d,
                        subjectId: d.subject_id ?? "",
                        docType: d.doc_type ?? SUBJECT_SUBFOLDERS[0],
                      })
                    }
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition hover:border-indigo-400/50 hover:text-white"
                  >
                    Mover
                  </button>
                  {d.drive_web_link && (
                    <a
                      href={d.drive_web_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
                    >
                      Abrir
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

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
