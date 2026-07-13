"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { relativeDue } from "@/lib/dates";
import {
  DEFAULT_LAYOUT,
  computeSuggestion,
  eventsWithin48h,
  focusWidgetFor,
  nextParcial,
  quoteOfDay,
  riskSubjects,
  type DashboardPayload,
  type WidgetId,
} from "@/lib/widgets";

type Props = {
  payload: DashboardPayload;
  initialLayout: WidgetId[];
  initialFocusMode: boolean;
};

const WIDGET_TITLES: Record<WidgetId, string> = {
  "next-parcial": "Próximo parcial",
  "next-48h": "Próximas 48 h",
  streak: "Racha de estudio",
  quote: "Cita del día",
  "study-climate": "Clima de estudio",
  "risk-subjects": "Materias en riesgo",
};

export function DashboardGrid({ payload, initialLayout, initialFocusMode }: Props) {
  const [layout, setLayout] = useState<WidgetId[]>(initialLayout);
  const [focusMode, setFocusMode] = useState(initialFocusMode);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (layout === initialLayout) return;
    const t = setTimeout(() => {
      fetch("/api/user-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboard_layout: layout }),
      }).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [layout, initialLayout]);

  const suggestion = useMemo(() => computeSuggestion(payload), [payload]);

  const now = useMemo(() => new Date(payload.now), [payload.now]);
  const focusId = focusWidgetFor(now.getHours());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(evt: DragEndEvent) {
    const { active, over } = evt;
    if (!over || active.id === over.id) return;
    setLayout((items) => {
      const oldIndex = items.indexOf(active.id as WidgetId);
      const newIndex = items.indexOf(over.id as WidgetId);
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  async function toggleFocus() {
    const next = !focusMode;
    setFocusMode(next);
    try {
      await fetch("/api/user-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focus_mode: next }),
      });
    } catch {}
  }

  async function resetLayout() {
    setLayout(DEFAULT_LAYOUT);
  }

  const visibleIds: WidgetId[] = focusMode ? [focusId] : layout;

  return (
    <section className="mt-6">
      {suggestion && !focusMode && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-indigo-400/25 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-transparent px-4 py-3 backdrop-blur-sm sm:px-5">
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <p className="min-w-0 flex-1 text-sm text-zinc-100">{suggestion.title}</p>
          {suggestion.action && (
            <Link
              href={suggestion.action.href}
              className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/15"
            >
              {suggestion.action.label} →
            </Link>
          )}
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          {focusMode ? "Modo enfoque" : "Panel"}
        </h2>
        <div className="flex items-center gap-2 text-xs">
          {!focusMode && (
            <>
              <button
                onClick={() => setEditing((v) => !v)}
                className={`rounded-md px-2 py-1 font-medium transition ${
                  editing
                    ? "bg-indigo-500/20 text-indigo-200"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                {editing ? "Listo" : "Reordenar"}
              </button>
              {editing && (
                <button
                  onClick={resetLayout}
                  className="text-zinc-500 transition hover:text-white"
                >
                  Restablecer
                </button>
              )}
            </>
          )}
          <button
            onClick={toggleFocus}
            className={`rounded-md px-2 py-1 font-medium transition ${
              focusMode
                ? "bg-indigo-500/20 text-indigo-200"
                : "text-zinc-500 hover:text-white"
            }`}
            title="Un solo widget grande según la hora del día"
          >
            {focusMode ? "Salir de enfoque" : "Modo enfoque"}
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visibleIds} strategy={rectSortingStrategy}>
          <div
            className={`grid gap-3 ${
              focusMode
                ? "grid-cols-1"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {visibleIds.map((id) => (
              <WidgetShell
                key={id}
                id={id}
                title={WIDGET_TITLES[id]}
                editing={editing && !focusMode}
                emphasized={focusMode}
              >
                <WidgetBody id={id} payload={payload} big={focusMode} />
              </WidgetShell>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}

function WidgetShell({
  id,
  title,
  editing,
  emphasized,
  children,
}: {
  id: WidgetId;
  title: string;
  editing: boolean;
  emphasized: boolean;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !editing });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm transition hover:border-white/20 ${
        isDragging ? "shadow-2xl shadow-indigo-500/20" : ""
      } ${emphasized ? "min-h-[280px] sm:p-8" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          {title}
        </p>
        {editing && (
          <button
            {...attributes}
            {...listeners}
            aria-label={`Mover ${title}`}
            className="cursor-grab rounded-md p-1 text-zinc-500 transition hover:bg-white/5 hover:text-white active:cursor-grabbing"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function WidgetBody({
  id,
  payload,
  big,
}: {
  id: WidgetId;
  payload: DashboardPayload;
  big: boolean;
}) {
  const now = new Date(payload.now);
  const nowMs = now.getTime();

  switch (id) {
    case "next-parcial": {
      const evt = nextParcial(payload.events, nowMs);
      if (!evt) {
        return (
          <p className="text-sm text-zinc-500">Sin evaluaciones próximas.</p>
        );
      }
      const subject = payload.subjects.find((s) => s.id === evt.subject_id);
      const rel = relativeDue(evt.due_at);
      return (
        <Link href="/calendario" className="block">
          <p
            className={`font-semibold text-white ${big ? "text-2xl" : "text-lg"}`}
          >
            {evt.title}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {subject?.name ?? "General"} · {evt.type}
          </p>
          <p
            className={`mt-3 inline-flex rounded-md px-2 py-1 text-xs font-medium ${
              rel.urgent
                ? "bg-amber-500/10 text-amber-300"
                : "bg-white/5 text-zinc-300"
            }`}
          >
            {rel.label}
          </p>
        </Link>
      );
    }
    case "next-48h": {
      const items = eventsWithin48h(payload.events, nowMs);
      if (items.length === 0) {
        return (
          <p className="text-sm text-zinc-500">Nada pendiente para las próximas 48 h.</p>
        );
      }
      return (
        <ul className="space-y-2">
          {items.slice(0, big ? 8 : 4).map((ev) => {
            const subject = payload.subjects.find((s) => s.id === ev.subject_id);
            const rel = relativeDue(ev.due_at);
            return (
              <li key={ev.id} className="flex items-center gap-3">
                <span
                  className="h-6 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: subject?.color ?? "#3f3f46" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {ev.title}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {subject?.name ?? "General"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${
                    rel.urgent
                      ? "bg-amber-500/10 text-amber-300"
                      : "text-zinc-500"
                  }`}
                >
                  {rel.label}
                </span>
              </li>
            );
          })}
        </ul>
      );
    }
    case "streak": {
      const s = payload.streak;
      return (
        <div>
          <p
            className={`font-bold text-white tabular-nums ${big ? "text-6xl" : "text-4xl"}`}
          >
            {s.current}
            <span
              className={`ml-2 text-zinc-500 ${big ? "text-2xl" : "text-base"}`}
            >
              d{s.current === 1 ? "ía" : "ías"}
            </span>
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {s.hasToday
              ? "Estudiaste hoy ✓"
              : s.current > 0
                ? "Estudia hoy para no romperla"
                : s.longest > 0
                  ? `Mejor racha: ${s.longest} días`
                  : "Empieza tu racha hoy"}
          </p>
          <Link
            href="/estudio"
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-indigo-400 transition hover:text-indigo-300"
          >
            Ir a estudio →
          </Link>
        </div>
      );
    }
    case "quote": {
      const q = quoteOfDay(now);
      return (
        <blockquote className={`italic text-zinc-200 ${big ? "text-2xl" : "text-sm"}`}>
          &ldquo;{q.q}&rdquo;
          <footer className="mt-3 text-xs not-italic text-zinc-500">— {q.a}</footer>
        </blockquote>
      );
    }
    case "study-climate": {
      const days = payload.studyByDay;
      const max = Math.max(1, ...days.map((d) => d.minutes));
      const totalMin = days.reduce((s, d) => s + d.minutes, 0);
      const totalH = Math.round((totalMin / 60) * 10) / 10;
      return (
        <div>
          <p
            className={`font-bold text-white tabular-nums ${big ? "text-5xl" : "text-3xl"}`}
          >
            {totalH}
            <span className={`ml-1 text-zinc-500 ${big ? "text-xl" : "text-sm"}`}>
              h
            </span>
          </p>
          <p className="mt-1 text-xs text-zinc-500">Últimos 7 días</p>
          <div
            className={`mt-4 flex items-end gap-1.5 ${big ? "h-32" : "h-16"}`}
          >
            {days.map((d) => {
              const h = (d.minutes / max) * 100;
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-indigo-500 to-violet-500 transition-all"
                      style={{ height: `${Math.max(4, h)}%` }}
                      title={`${d.minutes} min`}
                    />
                  </div>
                  <span className="text-[9px] uppercase text-zinc-600">
                    {new Date(d.date + "T00:00:00").toLocaleDateString("es-CO", {
                      weekday: "narrow",
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    case "risk-subjects": {
      const risks = riskSubjects(payload.subjects, payload.evaluations);
      if (risks.length === 0) {
        return (
          <p className="text-sm text-zinc-500">
            Ninguna materia en riesgo. Bien hecho.
          </p>
        );
      }
      return (
        <ul className="space-y-2.5">
          {risks.map((r) => (
            <li key={r.subject.id}>
              <Link
                href={`/materias/${r.subject.id}`}
                className="flex items-center gap-3 rounded-lg -mx-1 px-1 py-1 transition hover:bg-white/[0.04]"
              >
                <span
                  className="h-8 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: r.subject.color ?? "#3f3f46" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {r.subject.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {r.evaluatedPercent.toFixed(0)}% evaluado
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-red-500/10 px-2 py-0.5 text-sm font-bold tabular-nums text-red-300">
                  {r.accumulated.toFixed(1)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      );
    }
  }
}
