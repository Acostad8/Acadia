"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PROJECT_STATUSES } from "@/lib/types";
import type { Project, ProjectStatus, Subject } from "@/lib/types";

const STATUS_META: Record<ProjectStatus, { label: string; classes: string }> =
  {
    idea: {
      label: "Idea",
      classes: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    },
    en_desarrollo: {
      label: "En desarrollo",
      classes: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    },
    terminado: {
      label: "Terminado",
      classes: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    },
  };

type Draft = {
  id: string | null;
  name: string;
  description: string;
  status: ProjectStatus;
  technologies: string;
  members: string;
  repoUrl: string;
  demoUrl: string;
  subjectId: string;
  isPublic: boolean;
  coverUrl: string;
  highlights: string;
};

function emptyDraft(): Draft {
  return {
    id: null,
    name: "",
    description: "",
    status: "en_desarrollo",
    technologies: "",
    members: "",
    repoUrl: "",
    demoUrl: "",
    subjectId: "",
    isPublic: false,
    coverUrl: "",
    highlights: "",
  };
}

export function PortfolioClient({
  userId,
  currentSemesterId,
  subjects,
  initialProjects,
}: {
  userId: string;
  currentSemesterId: string | null;
  subjects: Subject[];
  initialProjects: Project[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [projects, setProjects] = useState(initialProjects);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjectById = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects]
  );

  function openEdit(p: Project) {
    setError(null);
    setDraft({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      status: p.status,
      technologies: p.technologies.join(", "),
      members: p.members ?? "",
      repoUrl: p.repo_url ?? "",
      demoUrl: p.demo_url ?? "",
      subjectId: p.subject_id ?? "",
      isPublic: p.is_public,
      coverUrl: p.cover_url ?? "",
      highlights: p.highlights ?? "",
    });
  }

  async function saveDraft() {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      setError("El nombre es obligatorio.");
      return;
    }
    setBusy(true);
    setError(null);
    const subject = draft.subjectId ? subjectById.get(draft.subjectId) : null;
    const payload = {
      name,
      description: draft.description.trim() || null,
      status: draft.status,
      technologies: draft.technologies
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      members: draft.members.trim() || null,
      repo_url: draft.repoUrl.trim() || null,
      demo_url: draft.demoUrl.trim() || null,
      subject_id: draft.subjectId || null,
      semester_id: subject?.semester_id ?? currentSemesterId,
      is_public: draft.isPublic,
      cover_url: draft.coverUrl.trim() || null,
      highlights: draft.highlights.trim() || null,
    };
    if (draft.id) {
      const { data, error: err } = await supabase
        .from("projects")
        .update(payload)
        .eq("id", draft.id)
        .select()
        .single();
      setBusy(false);
      if (err) {
        setError("No se pudo actualizar el proyecto.");
        return;
      }
      setProjects((prev) =>
        prev.map((p) => (p.id === draft.id ? (data as Project) : p))
      );
    } else {
      const { data, error: err } = await supabase
        .from("projects")
        .insert({ ...payload, user_id: userId })
        .select()
        .single();
      setBusy(false);
      if (err) {
        setError("No se pudo crear el proyecto.");
        return;
      }
      setProjects((prev) => [data as Project, ...prev]);
    }
    setDraft(null);
  }

  async function removeProject(id: string) {
    setBusy(true);
    const { error: err } = await supabase
      .from("projects")
      .delete()
      .eq("id", id);
    setBusy(false);
    if (err) {
      setError("No se pudo eliminar el proyecto.");
      return;
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setDraft(null);
  }

  const visible = statusFilter
    ? projects.filter((p) => p.status === statusFilter)
    : projects;

  const inputClasses =
    "rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-indigo-400/60";

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter(null)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              statusFilter === null
                ? "bg-white text-zinc-900"
                : "border border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"
            }`}
          >
            Todos
          </button>
          {PROJECT_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? null : s)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                statusFilter === s
                  ? "bg-white text-zinc-900"
                  : "border border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"
              }`}
            >
              {STATUS_META[s].label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/portafolio/publico"
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
          >
            Perfil público
          </Link>
          <button
            onClick={() => {
              setError(null);
              setDraft(emptyDraft());
            }}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110"
          >
            + Nuevo proyecto
          </button>
        </div>
      </div>

      {error && !draft && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-zinc-500">
          {projects.length === 0
            ? "Aún no hay proyectos. Documenta el primero con «+ Nuevo proyecto»."
            : "Sin proyectos para este filtro."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => {
            const subject = p.subject_id
              ? subjectById.get(p.subject_id)
              : undefined;
            return (
              <button
                key={p.id}
                onClick={() => openEdit(p)}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left backdrop-blur-sm transition hover:border-white/25 hover:bg-white/[0.05]"
              >
                <span
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ backgroundColor: subject?.color ?? "#6366f1" }}
                />
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold leading-snug text-white">
                    {p.name}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_META[p.status].classes}`}
                  >
                    {STATUS_META[p.status].label}
                  </span>
                </div>
                {p.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                    {p.description}
                  </p>
                )}
                {p.technologies.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.technologies.slice(0, 5).map((t) => (
                      <span
                        key={t}
                        className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-zinc-400"
                      >
                        {t}
                      </span>
                    ))}
                    {p.technologies.length > 5 && (
                      <span className="text-[11px] text-zinc-600">
                        +{p.technologies.length - 5}
                      </span>
                    )}
                  </div>
                )}
                <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  {subject?.name ?? "Sin materia"}
                  {p.repo_url && <span>· Repo</span>}
                  {p.demo_url && <span>· Demo</span>}
                  {p.is_public && (
                    <span className="ml-auto rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                      Público
                    </span>
                  )}
                </p>
              </button>
            );
          })}
        </div>
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
              {draft.id ? "Editar proyecto" : "Nuevo proyecto"}
            </h3>
            <div className="mt-4 space-y-3">
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Nombre del proyecto *"
                autoFocus
                className={`${inputClasses} w-full`}
              />
              <textarea
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                placeholder="Descripción"
                rows={3}
                className={`${inputClasses} w-full resize-none`}
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={draft.status}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      status: e.target.value as ProjectStatus,
                    })
                  }
                  className={`${inputClasses} w-full`}
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_META[s].label}
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
                value={draft.technologies}
                onChange={(e) =>
                  setDraft({ ...draft, technologies: e.target.value })
                }
                placeholder="Tecnologías separadas por coma (React, Postgres...)"
                className={`${inputClasses} w-full`}
              />
              <input
                value={draft.members}
                onChange={(e) =>
                  setDraft({ ...draft, members: e.target.value })
                }
                placeholder="Integrantes"
                className={`${inputClasses} w-full`}
              />
              <input
                value={draft.repoUrl}
                onChange={(e) =>
                  setDraft({ ...draft, repoUrl: e.target.value })
                }
                placeholder="URL del repositorio Git"
                className={`${inputClasses} w-full`}
              />
              <input
                value={draft.demoUrl}
                onChange={(e) =>
                  setDraft({ ...draft, demoUrl: e.target.value })
                }
                placeholder="URL de la demo o video"
                className={`${inputClasses} w-full`}
              />

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={draft.isPublic}
                    onChange={(e) =>
                      setDraft({ ...draft, isPublic: e.target.checked })
                    }
                    className="mt-0.5 h-4 w-4 cursor-pointer accent-indigo-500"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">
                      Mostrar en mi portafolio público
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      Aparecerá en{" "}
                      <span className="font-mono text-indigo-300">/p/[tu-slug]</span>{" "}
                      cuando tu perfil esté publicado.
                    </p>
                  </div>
                </label>
                {draft.isPublic && (
                  <div className="mt-3 space-y-3">
                    <input
                      value={draft.coverUrl}
                      onChange={(e) =>
                        setDraft({ ...draft, coverUrl: e.target.value })
                      }
                      placeholder="URL de imagen de portada (opcional)"
                      className={`${inputClasses} w-full`}
                    />
                    <textarea
                      value={draft.highlights}
                      onChange={(e) =>
                        setDraft({ ...draft, highlights: e.target.value })
                      }
                      placeholder="Logros o puntos destacados (opcional, se muestra en el portafolio público)"
                      rows={3}
                      className={`${inputClasses} w-full resize-none`}
                    />
                  </div>
                )}
              </div>
            </div>

            {error && (
              <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                {error}
              </p>
            )}

            <div className="mt-5 flex items-center gap-2">
              {draft.id && (
                <button
                  onClick={() => removeProject(draft.id as string)}
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

            {(draft.repoUrl || draft.demoUrl) && draft.id && (
              <div className="mt-4 flex gap-2 border-t border-white/5 pt-4">
                {draft.repoUrl && (
                  <a
                    href={draft.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
                  >
                    Abrir repositorio
                  </a>
                )}
                {draft.demoUrl && (
                  <a
                    href={draft.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
                  >
                    Abrir demo
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
