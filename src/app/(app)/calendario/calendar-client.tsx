"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { relativeDue } from "@/lib/dates";
import { EVENT_TYPES } from "@/lib/types";
import type { CalendarEvent, EventType, Subject } from "@/lib/types";

const TYPE_LABELS: Record<EventType, string> = {
  tarea: "Tarea",
  parcial: "Parcial",
  quiz: "Quiz",
  taller: "Taller",
  laboratorio: "Laboratorio",
  exposicion: "Exposición",
  otro: "Otro",
};

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const WEEKDAY_HEADERS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type Draft = {
  id: string | null;
  title: string;
  type: EventType;
  subjectId: string;
  date: string;
  time: string;
  notes: string;
};

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function emptyDraft(date?: string): Draft {
  return {
    id: null,
    title: "",
    type: "tarea",
    subjectId: "",
    date: date ?? toDateKey(new Date()),
    time: "23:59",
    notes: "",
  };
}

export function CalendarClient({
  semesterId,
  userId,
  subjects,
  initialEvents,
}: {
  semesterId: string;
  userId: string;
  subjects: Subject[];
  initialEvents: CalendarEvent[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState(initialEvents);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjectById = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects]
  );

  useEffect(() => {
    if (searchParams.get("draft") !== "1") return;
    const title = searchParams.get("title") ?? "";
    const dueIso = searchParams.get("due");
    const rawType = searchParams.get("type") ?? "tarea";
    const subject = searchParams.get("subject") ?? "";
    const due = dueIso ? new Date(dueIso) : new Date();
    const type = (EVENT_TYPES as readonly string[]).includes(rawType)
      ? (rawType as EventType)
      : "tarea";
    setDraft({
      id: null,
      title,
      type,
      subjectId: subject,
      date: toDateKey(due),
      time: `${String(due.getHours()).padStart(2, "0")}:${String(due.getMinutes()).padStart(2, "0")}`,
      notes: "",
    });
    router.replace("/calendario");
  }, [searchParams, router]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = toDateKey(new Date(ev.due_at));
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const upcoming = useMemo(
    () =>
      events
        .filter((e) => !e.completed)
        .sort(
          (a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
        ),
    [events]
  );

  // Celdas del mes: lunes como primer día de la semana
  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const result: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++)
      result.push(new Date(viewYear, viewMonth, d));
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [viewYear, viewMonth]);

  function changeMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function openEdit(ev: CalendarEvent) {
    const due = new Date(ev.due_at);
    setError(null);
    setDraft({
      id: ev.id,
      title: ev.title,
      type: ev.type,
      subjectId: ev.subject_id ?? "",
      date: toDateKey(due),
      time: `${String(due.getHours()).padStart(2, "0")}:${String(due.getMinutes()).padStart(2, "0")}`,
      notes: ev.notes ?? "",
    });
  }

  async function saveDraft() {
    if (!draft) return;
    const title = draft.title.trim();
    if (!title) {
      setError("El título es obligatorio.");
      return;
    }
    if (!draft.date) {
      setError("La fecha es obligatoria.");
      return;
    }
    setBusy(true);
    setError(null);
    const dueAt = new Date(`${draft.date}T${draft.time || "23:59"}`);
    const payload = {
      title,
      type: draft.type,
      subject_id: draft.subjectId || null,
      due_at: dueAt.toISOString(),
      notes: draft.notes.trim() || null,
    };
    if (draft.id) {
      const { data, error: err } = await supabase
        .from("events")
        .update(payload)
        .eq("id", draft.id)
        .select()
        .single();
      setBusy(false);
      if (err) {
        setError("No se pudo actualizar el evento.");
        return;
      }
      setEvents((prev) =>
        prev.map((e) => (e.id === draft.id ? (data as CalendarEvent) : e))
      );
    } else {
      const { data, error: err } = await supabase
        .from("events")
        .insert({ ...payload, semester_id: semesterId, user_id: userId })
        .select()
        .single();
      setBusy(false);
      if (err) {
        setError("No se pudo crear el evento.");
        return;
      }
      setEvents((prev) => [...prev, data as CalendarEvent]);
    }
    setDraft(null);
  }

  async function toggleCompleted(ev: CalendarEvent) {
    const { data, error: err } = await supabase
      .from("events")
      .update({ completed: !ev.completed })
      .eq("id", ev.id)
      .select()
      .single();
    if (err) {
      setError("No se pudo actualizar el evento.");
      return;
    }
    setEvents((prev) =>
      prev.map((e) => (e.id === ev.id ? (data as CalendarEvent) : e))
    );
  }

  async function removeEvent(id: string) {
    setBusy(true);
    const { error: err } = await supabase.from("events").delete().eq("id", id);
    setBusy(false);
    if (err) {
      setError("No se pudo eliminar el evento.");
      return;
    }
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setDraft(null);
  }

  const inputClasses =
    "rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-indigo-400/60";
  const todayKey = toDateKey(today);

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
      {/* Calendario mensual */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h2>
          <div className="flex gap-1">
            <button
              onClick={() => changeMonth(-1)}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-white/25 hover:text-white"
              aria-label="Mes anterior"
            >
              ←
            </button>
            <button
              onClick={() => {
                setViewYear(today.getFullYear());
                setViewMonth(today.getMonth());
              }}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-white/25 hover:text-white"
            >
              Hoy
            </button>
            <button
              onClick={() => changeMonth(1)}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-white/25 hover:text-white"
              aria-label="Mes siguiente"
            >
              →
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="grid grid-cols-7 border-b border-white/5">
            {WEEKDAY_HEADERS.map((d) => (
              <div
                key={d}
                className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-500"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((date, i) => {
              if (!date)
                return <div key={i} className="min-h-24 border-b border-r border-white/5 bg-white/[0.01]" />;
              const key = toDateKey(date);
              const dayEvents = eventsByDay.get(key) ?? [];
              const isToday = key === todayKey;
              return (
                <button
                  key={i}
                  onClick={() => {
                    setError(null);
                    setDraft(emptyDraft(key));
                  }}
                  className="min-h-24 border-b border-r border-white/5 p-1.5 text-left align-top transition hover:bg-white/[0.04]"
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      isToday
                        ? "bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white"
                        : "text-zinc-400"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const subject = ev.subject_id
                        ? subjectById.get(ev.subject_id)
                        : undefined;
                      return (
                        <span
                          key={ev.id}
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(ev);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.stopPropagation();
                              openEdit(ev);
                            }
                          }}
                          className={`block truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-tight transition hover:brightness-125 ${
                            ev.completed ? "line-through opacity-40" : ""
                          }`}
                          style={{
                            backgroundColor: `${subject?.color ?? "#6366f1"}26`,
                            color: subject?.color ?? "#a5b4fc",
                          }}
                          title={`${TYPE_LABELS[ev.type]}: ${ev.title}`}
                        >
                          {ev.title}
                        </span>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <span className="block px-1.5 text-[10px] text-zinc-500">
                        +{dayEvents.length - 3} más
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-600">
          Haz clic en un día para crear un evento, o en un evento para
          editarlo.
        </p>
      </section>

      {/* Panel lateral */}
      <aside className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Próximas entregas
          </h2>
          <button
            onClick={() => {
              setError(null);
              setDraft(emptyDraft());
            }}
            className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110"
          >
            + Nuevo
          </button>
        </div>

        {upcoming.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-zinc-500">
            Sin entregas pendientes. Crea una con «+ Nuevo».
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((ev) => {
              const subject = ev.subject_id
                ? subjectById.get(ev.subject_id)
                : undefined;
              const rel = relativeDue(ev.due_at);
              return (
                <li
                  key={ev.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-white/20"
                >
                  <input
                    type="checkbox"
                    checked={ev.completed}
                    onChange={() => toggleCompleted(ev)}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-indigo-500"
                    aria-label={`Completar ${ev.title}`}
                  />
                  <button
                    onClick={() => openEdit(ev)}
                    className="min-w-0 flex-1 rounded-lg px-1 py-0.5 text-left transition hover:bg-white/[0.04]"
                  >
                    <p className="truncate text-sm font-medium text-white">
                      {ev.title}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                      {subject && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: subject.color ?? "#6366f1" }}
                        />
                      )}
                      {subject?.name ?? TYPE_LABELS[ev.type]}
                    </p>
                  </button>
                  <span
                    className={`shrink-0 text-xs font-medium ${
                      rel.urgent ? "text-amber-400" : "text-zinc-500"
                    }`}
                  >
                    {rel.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* Modal crear/editar */}
      {draft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => !busy && setDraft(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">
              {draft.id ? "Editar evento" : "Nuevo evento"}
            </h3>
            <div className="mt-4 space-y-3">
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Título (ej. Entrega taller 2)"
                autoFocus
                className={`${inputClasses} w-full`}
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={draft.type}
                  onChange={(e) =>
                    setDraft({ ...draft, type: e.target.value as EventType })
                  }
                  className={`${inputClasses} w-full`}
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
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
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                  className={`${inputClasses} w-full [color-scheme:dark]`}
                />
                <input
                  type="time"
                  value={draft.time}
                  onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                  className={`${inputClasses} w-full [color-scheme:dark]`}
                />
              </div>
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="Notas (opcional)"
                rows={2}
                className={`${inputClasses} w-full resize-none`}
              />
            </div>

            {error && (
              <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                {error}
              </p>
            )}

            <div className="mt-5 flex items-center gap-2">
              {draft.id && (
                <button
                  onClick={() => removeEvent(draft.id as string)}
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
