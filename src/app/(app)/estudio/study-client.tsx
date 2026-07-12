"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { StudySession, Subject } from "@/lib/types";

const FOCUS_PRESETS = [25, 50] as const;
const BREAK_MINUTES: Record<number, number> = { 25: 5, 50: 10 };

type Phase = "idle" | "focus" | "break" | "done";

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatHours(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function StudyClient({
  userId,
  subjects,
  initialSessions,
}: {
  userId: string;
  subjects: Subject[];
  initialSessions: StudySession[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [sessions, setSessions] = useState(initialSessions);
  const [subjectId, setSubjectId] = useState("");
  const [focusMinutes, setFocusMinutes] = useState<number>(25);
  const [phase, setPhase] = useState<Phase>("idle");
  const [remaining, setRemaining] = useState(0);
  const endRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState({ minutes: "", notes: "" });
  const [busy, setBusy] = useState(false);

  const subjectById = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects]
  );

  async function saveSession(minutes: number, kind: "pomodoro" | "manual", notes?: string) {
    const { data, error: err } = await supabase
      .from("study_sessions")
      .insert({
        user_id: userId,
        subject_id: subjectId || null,
        duration_minutes: minutes,
        kind,
        notes: notes?.trim() || null,
      })
      .select()
      .single();
    if (err) {
      setError("No se pudo guardar la sesión.");
      return;
    }
    setSessions((prev) => [data as StudySession, ...prev]);
  }

  // Cuenta regresiva
  useEffect(() => {
    if (phase !== "focus" && phase !== "break") return;
    const tick = () => {
      const left = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        if (phase === "focus") {
          saveSession(focusMinutes, "pomodoro");
          endRef.current = Date.now() + BREAK_MINUTES[focusMinutes] * 60_000;
          setPhase("break");
        } else {
          setPhase("done");
        }
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, focusMinutes]);

  function startFocus() {
    setError(null);
    endRef.current = Date.now() + focusMinutes * 60_000;
    setPhase("focus");
  }

  function stopTimer(savePartial: boolean) {
    if (phase === "focus" && savePartial) {
      const elapsed = Math.round(
        (focusMinutes * 60 - remaining) / 60
      );
      if (elapsed >= 5) saveSession(elapsed, "pomodoro");
    }
    setPhase("idle");
    setRemaining(0);
  }

  async function logManual() {
    const minutes = Number(manual.minutes);
    if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 720) {
      setError("Los minutos deben estar entre 1 y 720.");
      return;
    }
    setBusy(true);
    setError(null);
    await saveSession(minutes, "manual", manual.notes);
    setBusy(false);
    setManual({ minutes: "", notes: "" });
  }

  async function removeSession(id: string) {
    const { error: err } = await supabase
      .from("study_sessions")
      .delete()
      .eq("id", id);
    if (err) {
      setError("No se pudo eliminar la sesión.");
      return;
    }
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  // ── Estadísticas ─────────────────────────────────────────────────────
  const now = new Date();
  const todayKey = toDateKey(now);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);

  const todayMinutes = sessions
    .filter((s) => toDateKey(new Date(s.started_at)) === todayKey)
    .reduce((sum, s) => sum + s.duration_minutes, 0);
  const weekMinutes = sessions
    .filter((s) => new Date(s.started_at) >= weekStart)
    .reduce((sum, s) => sum + s.duration_minutes, 0);

  // Racha: días consecutivos con al menos una sesión
  const daysWithStudy = new Set(
    sessions.map((s) => toDateKey(new Date(s.started_at)))
  );
  let streak = 0;
  const cursor = new Date(now);
  if (!daysWithStudy.has(toDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (daysWithStudy.has(toDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const minutesBySubject = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      const key = s.subject_id ?? "otro";
      map.set(key, (map.get(key) ?? 0) + s.duration_minutes);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [sessions]);
  const maxSubjectMinutes = minutesBySubject[0]?.[1] ?? 1;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const totalPhaseSeconds =
    phase === "break" ? BREAK_MINUTES[focusMinutes] * 60 : focusMinutes * 60;
  const progress =
    phase === "focus" || phase === "break"
      ? 1 - remaining / totalPhaseSeconds
      : 0;

  const inputClasses =
    "rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-indigo-400/60";

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
      <section className="space-y-6">
        {/* Temporizador */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center">
          {phase === "idle" || phase === "done" ? (
            <>
              {phase === "done" && (
                <p className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  ¡Pomodoro completado! Descanso terminado — cuando quieras,
                  otra ronda.
                </p>
              )}
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Sesión de enfoque
              </p>
              <div className="mt-4 flex justify-center gap-2">
                {FOCUS_PRESETS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setFocusMinutes(m)}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                      focusMinutes === m
                        ? "bg-white text-zinc-900"
                        : "border border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"
                    }`}
                  >
                    {m} min
                  </button>
                ))}
              </div>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className={`${inputClasses} mx-auto mt-4 block`}
              >
                <option value="">Sin materia (estudio general)</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                onClick={startFocus}
                className="mt-6 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-10 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110"
              >
                Iniciar {focusMinutes} minutos
              </button>
              <p className="mt-3 text-xs text-zinc-600">
                Al terminar el enfoque, la sesión se guarda y arranca un
                descanso de {BREAK_MINUTES[focusMinutes]} minutos.
              </p>
            </>
          ) : (
            <>
              <p
                className={`text-xs font-semibold uppercase tracking-widest ${
                  phase === "focus" ? "text-indigo-400" : "text-emerald-400"
                }`}
              >
                {phase === "focus"
                  ? `Enfocado${subjectId ? ` · ${subjectById.get(subjectId)?.name}` : ""}`
                  : "Descanso"}
              </p>
              <p className="mt-4 text-7xl font-bold tabular-nums tracking-tight text-white">
                {String(minutes).padStart(2, "0")}:
                {String(seconds).padStart(2, "0")}
              </p>
              <div className="mx-auto mt-6 h-2 max-w-md overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all ${
                    phase === "focus"
                      ? "bg-gradient-to-r from-indigo-500 to-violet-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="mt-6 flex justify-center gap-2">
                {phase === "focus" && (
                  <button
                    onClick={() => stopTimer(true)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:border-white/25 hover:text-white"
                    title="Guarda los minutos completados (mínimo 5)"
                  >
                    Terminar y guardar
                  </button>
                )}
                <button
                  onClick={() => stopTimer(false)}
                  className="rounded-xl px-4 py-2 text-sm text-zinc-500 transition hover:bg-white/5 hover:text-white"
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>

        {/* Registro manual */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Registrar estudio manualmente
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={manual.minutes}
              onChange={(e) => setManual({ ...manual, minutes: e.target.value })}
              placeholder="Minutos"
              inputMode="numeric"
              className={`${inputClasses} w-24`}
            />
            <input
              value={manual.notes}
              onChange={(e) => setManual({ ...manual, notes: e.target.value })}
              placeholder="Notas (opcional)"
              className={`${inputClasses} min-w-0 flex-1`}
            />
            <button
              onClick={logManual}
              disabled={busy}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              Registrar
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-600">
            Se registra en la materia seleccionada arriba.
          </p>
        </div>

        {error && (
          <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {/* Sesiones recientes */}
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Sesiones recientes
          </h2>
          {sessions.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-zinc-500">
              Aún no hay sesiones. Inicia tu primer pomodoro.
            </p>
          ) : (
            <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
              {sessions.slice(0, 12).map((s) => {
                const subject = s.subject_id
                  ? subjectById.get(s.subject_id)
                  : undefined;
                return (
                  <li
                    key={s.id}
                    className="group flex items-center gap-4 px-5 py-3 transition hover:bg-white/[0.03]"
                  >
                    <span
                      className="h-8 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: subject?.color ?? "#3f3f46" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">
                        {formatHours(s.duration_minutes)}
                        <span className="ml-2 text-xs font-normal text-zinc-500">
                          {subject?.name ?? "General"}
                          {s.kind === "pomodoro" ? " · pomodoro" : ""}
                          {s.notes ? ` · ${s.notes}` : ""}
                        </span>
                      </p>
                      <p className="text-xs text-zinc-600">
                        {new Date(s.started_at).toLocaleString("es-CO", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => removeSession(s.id)}
                      aria-label="Eliminar sesión"
                      className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-xs text-zinc-400 opacity-0 transition hover:border-red-500/40 hover:text-red-400 group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Panel lateral: estadísticas */}
      <aside className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Tus números
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Hoy", value: formatHours(todayMinutes) },
            { label: "Esta semana", value: formatHours(weekMinutes) },
            { label: "Racha", value: `${streak} día${streak === 1 ? "" : "s"}` },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center"
            >
              <p className="text-lg font-bold tabular-nums text-white">
                {stat.value}
              </p>
              <p className="mt-0.5 text-[10px] text-zinc-500">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="mb-3 text-xs font-medium text-zinc-400">
            Por materia (últimos 28 días)
          </p>
          {minutesBySubject.length === 0 ? (
            <p className="text-center text-xs text-zinc-600">Sin datos aún.</p>
          ) : (
            <div className="space-y-2.5">
              {minutesBySubject.map(([key, mins]) => {
                const subject = key !== "otro" ? subjectById.get(key) : undefined;
                return (
                  <div key={key}>
                    <div className="mb-1 flex items-baseline justify-between text-xs">
                      <span className="truncate text-zinc-400">
                        {subject?.name ?? "General"}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-white">
                        {formatHours(mins)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(mins / maxSubjectMinutes) * 100}%`,
                          backgroundColor: subject?.color ?? "#6366f1",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
