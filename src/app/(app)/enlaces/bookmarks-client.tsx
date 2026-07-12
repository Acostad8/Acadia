"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BOOKMARK_KINDS } from "@/lib/types";
import type { Bookmark, BookmarkKind, Subject } from "@/lib/types";

const KIND_LABELS: Record<BookmarkKind, string> = {
  articulo: "Artículo",
  video: "Video",
  blog: "Blog",
  paper: "Paper",
  normativa: "Normativa",
  repositorio: "Repositorio",
  otro: "Otro",
};

const KIND_STYLE: Record<BookmarkKind, string> = {
  articulo: "bg-indigo-500/10 text-indigo-300",
  video: "bg-rose-500/10 text-rose-300",
  blog: "bg-sky-500/10 text-sky-300",
  paper: "bg-emerald-500/10 text-emerald-300",
  normativa: "bg-amber-500/10 text-amber-300",
  repositorio: "bg-violet-500/10 text-violet-300",
  otro: "bg-white/10 text-zinc-300",
};

type Draft = {
  id: string | null;
  url: string;
  title: string;
  description: string;
  kind: BookmarkKind;
  subjectId: string;
  tagsInput: string;
  faviconUrl: string;
};

function emptyDraft(): Draft {
  return {
    id: null,
    url: "",
    title: "",
    description: "",
    kind: "articulo",
    subjectId: "",
    tagsInput: "",
    faviconUrl: "",
  };
}

const inputClasses =
  "rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-indigo-400/60";

export function BookmarksClient({
  userId,
  subjects,
  initialBookmarks,
}: {
  userId: string;
  subjects: Subject[];
  initialBookmarks: Bookmark[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<BookmarkKind | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const subjectById = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects]
  );

  const allTags = useMemo(() => {
    const s = new Set<string>();
    bookmarks.forEach((b) => b.tags.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [bookmarks]);

  async function fetchMetadata(url: string) {
    setFetching(true);
    setError(null);
    try {
      const res = await fetch("/api/bookmarks/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo leer la URL");
      setDraft({
        id: null,
        url: json.url,
        title: json.title ?? "",
        description: json.description ?? "",
        kind: json.kind ?? "articulo",
        subjectId: "",
        tagsInput: "",
        faviconUrl: json.favicon_url ?? "",
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo leer la URL."
      );
    } finally {
      setFetching(false);
    }
  }

  async function saveDraft() {
    if (!draft) return;
    if (!draft.title.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    if (!draft.url.trim()) {
      setError("La URL es obligatoria.");
      return;
    }
    setBusy(true);
    setError(null);
    const tags = draft.tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const payload = {
      url: draft.url.trim(),
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      kind: draft.kind,
      subject_id: draft.subjectId || null,
      tags,
      favicon_url: draft.faviconUrl || null,
    };
    if (draft.id) {
      const { data, error: err } = await supabase
        .from("bookmarks")
        .update(payload)
        .eq("id", draft.id)
        .select()
        .single();
      setBusy(false);
      if (err) {
        setError("No se pudo actualizar el enlace.");
        return;
      }
      setBookmarks((prev) =>
        prev.map((b) => (b.id === draft.id ? (data as Bookmark) : b))
      );
    } else {
      const { data, error: err } = await supabase
        .from("bookmarks")
        .insert({ ...payload, user_id: userId })
        .select()
        .single();
      setBusy(false);
      if (err) {
        setError("No se pudo crear el enlace.");
        return;
      }
      setBookmarks((prev) => [data as Bookmark, ...prev]);
    }
    setDraft(null);
  }

  async function removeBookmark(id: string) {
    if (!confirm("¿Eliminar este enlace?")) return;
    const { error: err } = await supabase.from("bookmarks").delete().eq("id", id);
    if (err) {
      setError("No se pudo eliminar el enlace.");
      return;
    }
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }

  function openEdit(b: Bookmark) {
    setDraft({
      id: b.id,
      url: b.url,
      title: b.title,
      description: b.description ?? "",
      kind: b.kind,
      subjectId: b.subject_id ?? "",
      tagsInput: b.tags.join(", "),
      faviconUrl: b.favicon_url ?? "",
    });
  }

  const query = search.trim().toLowerCase();
  const visible = bookmarks.filter((b) => {
    if (kindFilter && b.kind !== kindFilter) return false;
    if (subjectFilter && b.subject_id !== subjectFilter) return false;
    if (tagFilter && !b.tags.includes(tagFilter)) return false;
    if (!query) return true;
    return (
      b.title.toLowerCase().includes(query) ||
      (b.description ?? "").toLowerCase().includes(query) ||
      b.url.toLowerCase().includes(query) ||
      b.tags.some((t) => t.toLowerCase().includes(query))
    );
  });

  const kindCounts = useMemo(() => {
    const m = new Map<BookmarkKind, number>();
    bookmarks.forEach((b) => m.set(b.kind, (m.get(b.kind) ?? 0) + 1));
    return m;
  }, [bookmarks]);

  return (
    <div className="mt-8 space-y-6">
      {!draft && (
        <AddByUrl fetching={fetching} onFetch={fetchMetadata} />
      )}

      {draft && (
        <div className="rounded-2xl border border-indigo-400/30 bg-indigo-500/[0.06] p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">
              {draft.id ? "Editar enlace" : "Nuevo enlace"}
            </p>
            {draft.faviconUrl && (
              <img
                src={draft.faviconUrl}
                alt=""
                className="h-6 w-6 rounded"
              />
            )}
          </div>
          <div className="mt-4 space-y-3">
            <input
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              placeholder="URL *"
              className={`${inputClasses} w-full`}
            />
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Título *"
              className={`${inputClasses} w-full`}
            />
            <textarea
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
              placeholder="Descripción (opcional)"
              rows={2}
              className={`${inputClasses} w-full resize-none`}
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={draft.kind}
                onChange={(e) =>
                  setDraft({ ...draft, kind: e.target.value as BookmarkKind })
                }
                className={`${inputClasses} w-full`}
              >
                {BOOKMARK_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABELS[k]}
                  </option>
                ))}
              </select>
              <select
                value={draft.subjectId}
                onChange={(e) =>
                  setDraft({ ...draft, subjectId: e.target.value })
                }
                className={`${inputClasses} w-full`}
              >
                <option value="">Sin materia</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <input
              value={draft.tagsInput}
              onChange={(e) =>
                setDraft({ ...draft, tagsInput: e.target.value })
              }
              placeholder="Etiquetas separadas por coma (ej. redes, tcp, seguridad)"
              className={`${inputClasses} w-full`}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => {
                setDraft(null);
                setError(null);
              }}
              disabled={busy}
              className="rounded-xl px-4 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={saveDraft}
              disabled={busy}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {bookmarks.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3 backdrop-blur-sm sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="m20 20-3.5-3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, descripción, URL o etiqueta..."
              className="w-full rounded-xl border border-white/5 bg-zinc-900/60 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-indigo-400/60"
            />
          </div>
        </div>
      )}

      {bookmarks.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setKindFilter(null)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                kindFilter === null
                  ? "bg-indigo-500/20 text-indigo-200"
                  : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
              }`}
            >
              Todos ({bookmarks.length})
            </button>
            {BOOKMARK_KINDS.map((k) => {
              const count = kindCounts.get(k) ?? 0;
              if (count === 0) return null;
              return (
                <button
                  key={k}
                  onClick={() =>
                    setKindFilter(kindFilter === k ? null : k)
                  }
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                    kindFilter === k
                      ? "bg-indigo-500/20 text-indigo-200"
                      : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                  }`}
                >
                  {KIND_LABELS[k]} <span className="text-zinc-600">({count})</span>
                </button>
              );
            })}
          </div>
          {subjects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSubjectFilter(null)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  subjectFilter === null
                    ? "bg-white text-zinc-900"
                    : "border border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"
                }`}
              >
                Todas las materias
              </button>
              {subjects.map((s) => (
                <button
                  key={s.id}
                  onClick={() =>
                    setSubjectFilter(subjectFilter === s.id ? null : s.id)
                  }
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                    subjectFilter === s.id
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
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setTagFilter(tagFilter === t ? null : t)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
                    tagFilter === t
                      ? "bg-fuchsia-500/20 text-fuchsia-200"
                      : "border border-white/10 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center">
          <p className="text-sm text-zinc-400">
            {bookmarks.length === 0
              ? "Aún no hay enlaces. Pega una URL para empezar."
              : "Sin resultados para este filtro."}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((b) => {
            const subject = b.subject_id ? subjectById.get(b.subject_id) : null;
            const host = (() => {
              try {
                return new URL(b.url).hostname.replace(/^www\./, "");
              } catch {
                return b.url;
              }
            })();
            return (
              <li
                key={b.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.05]"
              >
                {subject && (
                  <span
                    className="absolute inset-x-0 top-0 h-0.5"
                    style={{ backgroundColor: subject.color ?? "#6366f1" }}
                  />
                )}
                <div className="flex items-start gap-3">
                  {b.favicon_url ? (
                    <img
                      src={b.favicon_url}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-lg bg-white/5 p-1"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-xs font-bold text-zinc-400">
                      {host.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="line-clamp-2 break-words text-sm font-semibold text-white transition hover:text-indigo-300"
                    >
                      {b.title}
                    </a>
                    <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                      {host}
                    </p>
                  </div>
                </div>
                {b.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-zinc-400">
                    {b.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${KIND_STYLE[b.kind]}`}
                  >
                    {KIND_LABELS[b.kind]}
                  </span>
                  {b.tags.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] text-zinc-500"
                    >
                      #{t}
                    </span>
                  ))}
                  {b.tags.length > 3 && (
                    <span className="text-[10px] text-zinc-600">
                      +{b.tags.length - 3}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex gap-1.5 border-t border-white/5 pt-3">
                  <button
                    onClick={() => openEdit(b)}
                    className="rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-400 transition hover:bg-white/10 hover:text-white"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => removeBookmark(b.id)}
                    className="rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-400 transition hover:bg-red-500/20 hover:text-red-300"
                  >
                    Eliminar
                  </button>
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
                  >
                    Abrir →
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AddByUrl({
  fetching,
  onFetch,
}: {
  fetching: boolean;
  onFetch: (url: string) => void;
}) {
  const [url, setUrl] = useState("");
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
      <p className="mb-2 text-xs font-medium text-indigo-300">
        Pega una URL y Acadia extrae título + descripción
      </p>
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && url.trim()) {
              e.preventDefault();
              onFetch(url.trim());
              setUrl("");
            }
          }}
          placeholder="https://..."
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-indigo-400/60"
        />
        <button
          onClick={() => {
            if (url.trim()) {
              onFetch(url.trim());
              setUrl("");
            }
          }}
          disabled={fetching || !url.trim()}
          className="shrink-0 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
        >
          {fetching ? "Leyendo..." : "Agregar"}
        </button>
      </div>
    </div>
  );
}
