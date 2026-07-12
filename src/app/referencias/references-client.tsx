"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CITATION_STYLES, formatCitation } from "@/lib/citations";
import type { CitationStyle } from "@/lib/citations";
import { REFERENCE_KINDS } from "@/lib/types";
import type { BibReference, ReferenceKind, Subject } from "@/lib/types";

const KIND_LABELS: Record<ReferenceKind, string> = {
  articulo: "Artículo",
  libro: "Libro",
  web: "Sitio web",
  otro: "Otro",
};

type Draft = {
  id: string | null;
  kind: ReferenceKind;
  title: string;
  authors: string;
  year: string;
  source: string;
  url: string;
  doi: string;
  subjectId: string;
};

function emptyDraft(): Draft {
  return {
    id: null,
    kind: "articulo",
    title: "",
    authors: "",
    year: "",
    source: "",
    url: "",
    doi: "",
    subjectId: "",
  };
}

export function ReferencesClient({
  userId,
  subjects,
  initialReferences,
}: {
  userId: string;
  subjects: Subject[];
  initialReferences: BibReference[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [references, setReferences] = useState(initialReferences);
  const [style, setStyle] = useState<CitationStyle>("APA 7");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [lookup, setLookup] = useState("");
  const [fetchingDoi, setFetchingDoi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  const subjectById = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects]
  );

  async function autofill() {
    if (!draft) return;
    const value = lookup.trim();
    if (!value) return;
    setFetchingDoi(true);
    setError(null);
    try {
      const isDoi =
        /^10\.\d{4,}/.test(value) ||
        /^https?:\/\/(dx\.)?doi\.org\//i.test(value);
      let res: Response;
      if (isDoi) {
        const doi = value.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
        res = await fetch(`/api/references/doi?doi=${encodeURIComponent(doi)}`);
      } else {
        res = await fetch("/api/references/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: value }),
        });
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo leer el enlace");
      setDraft({
        ...draft,
        kind: json.kind ?? draft.kind,
        title: json.title || draft.title,
        authors: json.authors || draft.authors,
        year: json.year ? String(json.year) : draft.year,
        source: json.source || draft.source,
        url: json.url || draft.url,
        doi: json.doi || draft.doi,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo extraer la información del enlace."
      );
    } finally {
      setFetchingDoi(false);
    }
  }

  async function saveDraft() {
    if (!draft) return;
    const title = draft.title.trim();
    if (!title) {
      setError("El título es obligatorio.");
      return;
    }
    let year: number | null = null;
    if (draft.year.trim() !== "") {
      year = Number(draft.year);
      if (!Number.isInteger(year) || year < 1000 || year > 2100) {
        setError("El año no es válido.");
        return;
      }
    }
    setBusy(true);
    setError(null);
    const payload = {
      kind: draft.kind,
      title,
      authors: draft.authors.trim() || null,
      year,
      source: draft.source.trim() || null,
      url: draft.url.trim() || null,
      doi: draft.doi.trim().replace(/^https?:\/\/doi\.org\//i, "") || null,
      subject_id: draft.subjectId || null,
    };
    if (draft.id) {
      const { data, error: err } = await supabase
        .from("bib_references")
        .update(payload)
        .eq("id", draft.id)
        .select()
        .single();
      setBusy(false);
      if (err) {
        setError("No se pudo actualizar la referencia.");
        return;
      }
      setReferences((prev) =>
        prev.map((r) => (r.id === draft.id ? (data as BibReference) : r))
      );
    } else {
      const { data, error: err } = await supabase
        .from("bib_references")
        .insert({ ...payload, user_id: userId })
        .select()
        .single();
      setBusy(false);
      if (err) {
        setError("No se pudo crear la referencia.");
        return;
      }
      setReferences((prev) => [data as BibReference, ...prev]);
    }
    setDraft(null);
  }

  async function removeReference(id: string) {
    setBusy(true);
    const { error: err } = await supabase
      .from("bib_references")
      .delete()
      .eq("id", id);
    setBusy(false);
    if (err) {
      setError("No se pudo eliminar la referencia.");
      return;
    }
    setReferences((prev) => prev.filter((r) => r.id !== id));
    setDraft(null);
  }

  async function copyCitation(ref: BibReference) {
    await navigator.clipboard.writeText(formatCitation(ref, style));
    setCopiedId(ref.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  function openEdit(ref: BibReference) {
    setError(null);
    setLookup("");
    setDraft({
      id: ref.id,
      kind: ref.kind,
      title: ref.title,
      authors: ref.authors ?? "",
      year: ref.year === null ? "" : String(ref.year),
      source: ref.source ?? "",
      url: ref.url ?? "",
      doi: ref.doi ?? "",
      subjectId: ref.subject_id ?? "",
    });
  }

  const visible = filter
    ? references.filter((r) => r.subject_id === filter)
    : references;

  const inputClasses =
    "rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-indigo-400/60";

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex overflow-hidden rounded-xl border border-white/10">
          {CITATION_STYLES.map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={`px-3.5 py-2 text-sm font-medium transition ${
                style === s
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            setError(null);
            setLookup("");
            setDraft(emptyDraft());
          }}
          className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110"
        >
          + Nueva referencia
        </button>
      </div>

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

      {error && !draft && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-zinc-500">
          {references.length === 0
            ? "Aún no hay referencias. Crea la primera con «+ Nueva referencia»."
            : "Sin referencias para este filtro."}
        </p>
      ) : (
        <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          {visible.map((ref) => {
            const subject = ref.subject_id
              ? subjectById.get(ref.subject_id)
              : undefined;
            return (
              <li
                key={ref.id}
                className="group flex items-start gap-4 px-5 py-4 transition hover:bg-white/[0.03]"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed text-zinc-200">
                    {formatCitation(ref, style)}
                  </p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-500">
                    <span className="rounded-full border border-white/10 px-2 py-0.5">
                      {KIND_LABELS[ref.kind]}
                    </span>
                    {subject && (
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: subject.color ?? "#6366f1",
                          }}
                        />
                        {subject.name}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() => copyCitation(ref)}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
                  >
                    {copiedId === ref.id ? "¡Copiada!" : "Copiar"}
                  </button>
                  <button
                    onClick={() => openEdit(ref)}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 opacity-0 transition group-hover:opacity-100 hover:border-white/25 hover:text-white"
                  >
                    Editar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Modal crear/editar */}
      {draft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => !busy && setDraft(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">
              {draft.id ? "Editar referencia" : "Nueva referencia"}
            </h3>

            <div className="mt-4 rounded-2xl border border-indigo-400/25 bg-indigo-500/[0.06] p-3">
              <p className="mb-2 text-xs font-medium text-indigo-300">
                Pega un enlace o DOI y Acadia completa la referencia
              </p>
              <div className="flex gap-2">
                <input
                  value={lookup}
                  onChange={(e) => setLookup(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      autofill();
                    }
                  }}
                  placeholder="https://... o 10.1000/xyz123"
                  className={`${inputClasses} min-w-0 flex-1`}
                />
                <button
                  onClick={autofill}
                  disabled={fetchingDoi || !lookup.trim()}
                  className="shrink-0 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
                >
                  {fetchingDoi ? "Leyendo..." : "Autocompletar"}
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-3">
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Título *"
                className={`${inputClasses} w-full`}
              />
              <input
                value={draft.authors}
                onChange={(e) =>
                  setDraft({ ...draft, authors: e.target.value })
                }
                placeholder="Autores — Apellido, N.; Apellido, M."
                className={`${inputClasses} w-full`}
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={draft.kind}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      kind: e.target.value as ReferenceKind,
                    })
                  }
                  className={`${inputClasses} w-full`}
                >
                  {REFERENCE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
                <input
                  value={draft.year}
                  onChange={(e) => setDraft({ ...draft, year: e.target.value })}
                  placeholder="Año"
                  className={`${inputClasses} w-full`}
                />
              </div>
              <input
                value={draft.source}
                onChange={(e) =>
                  setDraft({ ...draft, source: e.target.value })
                }
                placeholder="Revista / editorial / sitio"
                className={`${inputClasses} w-full`}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={draft.url}
                  onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                  placeholder="URL"
                  className={`${inputClasses} w-full`}
                />
                <input
                  value={draft.doi}
                  onChange={(e) => setDraft({ ...draft, doi: e.target.value })}
                  placeholder="DOI (opcional)"
                  className={`${inputClasses} w-full`}
                />
              </div>
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

            {/* Vista previa en vivo de la cita */}
            {draft.title.trim() && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Vista previa · {style}
                  </p>
                  <div className="flex gap-1">
                    {CITATION_STYLES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setStyle(s)}
                        className={`rounded-md px-2 py-0.5 text-[11px] transition ${
                          style === s
                            ? "bg-white/10 text-white"
                            : "text-zinc-500 hover:text-white"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-zinc-200">
                  {formatCitation(
                    {
                      id: "preview",
                      user_id: "",
                      subject_id: null,
                      kind: draft.kind,
                      title: draft.title.trim(),
                      authors: draft.authors.trim() || null,
                      year: /^\d{4}$/.test(draft.year.trim())
                        ? Number(draft.year)
                        : null,
                      source: draft.source.trim() || null,
                      url: draft.url.trim() || null,
                      doi:
                        draft.doi
                          .trim()
                          .replace(/^https?:\/\/doi\.org\//i, "") || null,
                      created_at: "",
                    },
                    style
                  )}
                </p>
              </div>
            )}

            {error && (
              <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                {error}
              </p>
            )}

            <div className="mt-5 flex items-center gap-2">
              {draft.id && (
                <button
                  onClick={() => removeReference(draft.id as string)}
                  disabled={busy}
                  className="rounded-xl border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                >
                  Eliminar
                </button>
              )}
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => setDraft(null)}
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
          </div>
        </div>
      )}
    </div>
  );
}
