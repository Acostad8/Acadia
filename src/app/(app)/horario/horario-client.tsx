"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ScheduleBlock, Subject } from "@/lib/types";
import { WeeklySchedule } from "../dashboard/weekly-schedule";

type View = "semanal" | "diaria" | "mensual";

const MONTHS = [
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

const DAYS_FULL = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const HEADERS_MONDAY = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function HorarioClient({
  subjects,
  blocks,
}: {
  subjects: Subject[];
  blocks: ScheduleBlock[];
}) {
  const [view, setView] = useState<View>("semanal");
  const [date, setDate] = useState<Date>(() => new Date());
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const subjectById = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects]
  );

  const tabs: { id: View; label: string }[] = [
    { id: "semanal", label: "Semanal" },
    { id: "diaria", label: "Diaria" },
    { id: "mensual", label: "Mensual" },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                view === t.id
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            if (typeof window !== "undefined") window.print();
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
          aria-label="Imprimir horario"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-3.5 w-3.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z" />
          </svg>
          Imprimir
        </button>
      </div>

      {view === "semanal" && (
        <WeeklySchedule subjects={subjects} blocks={blocks} />
      )}

      {view === "diaria" && (
        <DailySchedule
          date={date}
          setDate={setDate}
          subjectById={subjectById}
          blocks={blocks}
        />
      )}

      {view === "mensual" && (
        <MonthlySchedule
          year={monthCursor.year}
          month={monthCursor.month}
          setMonthCursor={setMonthCursor}
          subjectById={subjectById}
          blocks={blocks}
          onPickDay={(d) => {
            setDate(d);
            setView("diaria");
          }}
        />
      )}
    </div>
  );
}

function DailySchedule({
  date,
  setDate,
  subjectById,
  blocks,
}: {
  date: Date;
  setDate: (d: Date) => void;
  subjectById: Map<string, Subject>;
  blocks: ScheduleBlock[];
}) {
  const dow = date.getDay();
  const today = new Date();
  const isToday = toDateKey(date) === toDateKey(today);

  const dayBlocks = useMemo(
    () =>
      blocks
        .filter((b) => b.day_of_week === dow)
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [blocks, dow]
  );

  const [nowMinutes, setNowMinutes] = useState<number | null>(null);
  useEffect(() => {
    if (!isToday) {
      setNowMinutes(null);
      return;
    }
    const update = () => {
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [isToday]);

  function shiftDay(delta: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d);
  }

  const startHour = dayBlocks.length
    ? Math.floor(toMinutes(dayBlocks[0].start_time) / 60)
    : 7;
  const endHour = dayBlocks.length
    ? Math.ceil(toMinutes(dayBlocks[dayBlocks.length - 1].end_time) / 60)
    : 20;
  const hours = Math.max(1, endHour - startHour);
  const ROW = 64;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-lg font-semibold text-white">
            {DAYS_FULL[dow]}, {date.getDate()} de{" "}
            {MONTHS[date.getMonth()].toLowerCase()}
          </p>
          {isToday && (
            <p className="text-xs font-medium text-indigo-300">Hoy</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={toDateKey(date)}
            onChange={(e) => {
              const [y, m, d] = e.target.value.split("-").map(Number);
              if (y && m && d) setDate(new Date(y, m - 1, d));
            }}
            className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-400/60"
          />
          <button
            onClick={() => shiftDay(-1)}
            aria-label="Día anterior"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-white/25 hover:text-white"
          >
            ←
          </button>
          <button
            onClick={() => setDate(new Date())}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-white/25 hover:text-white"
          >
            Hoy
          </button>
          <button
            onClick={() => shiftDay(1)}
            aria-label="Día siguiente"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-white/25 hover:text-white"
          >
            →
          </button>
        </div>
      </div>

      {dayBlocks.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-zinc-500">
          Sin clases este {DAYS_FULL[dow].toLowerCase()}.
        </p>
      ) : (
        <div
          className="relative rounded-2xl border border-white/10 bg-white/[0.02] pl-14 pr-2 py-3"
          style={{ height: hours * ROW + 24 }}
        >
          {Array.from({ length: hours + 1 }, (_, i) => (
            <div
              key={i}
              className="absolute left-14 right-2 border-t border-white/5"
              style={{ top: 12 + i * ROW }}
            >
              <span className="absolute -left-14 -top-2 w-12 pr-2 text-right font-mono text-[10px] text-zinc-500">
                {String(startHour + i).padStart(2, "0")}:00
              </span>
            </div>
          ))}

          {dayBlocks.map((b) => {
            const subj = subjectById.get(b.subject_id);
            const color = subj?.color ?? "#6366f1";
            const top =
              12 +
              ((toMinutes(b.start_time) - startHour * 60) / 60) * ROW;
            const height =
              ((toMinutes(b.end_time) - toMinutes(b.start_time)) / 60) * ROW -
              4;
            const isNow =
              nowMinutes !== null &&
              nowMinutes >= toMinutes(b.start_time) &&
              nowMinutes < toMinutes(b.end_time);
            return (
              <Link
                key={b.id}
                href={`/materias/${b.subject_id}`}
                className="absolute left-14 right-2 overflow-hidden rounded-xl border p-3 transition hover:brightness-110"
                style={{
                  top,
                  height,
                  backgroundColor: `${color}26`,
                  borderColor: isNow ? color : `${color}59`,
                  boxShadow: isNow ? `0 0 0 1px ${color}` : undefined,
                }}
              >
                <span
                  className="absolute inset-y-0 left-0 w-1"
                  style={{ backgroundColor: color }}
                />
                <p className="pl-2 text-sm font-semibold leading-tight text-white truncate">
                  {subj?.name ?? "?"}
                </p>
                <p className="pl-2 font-mono text-[11px] text-zinc-400">
                  {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                  {b.room_code ? ` · ${b.room_code}` : ""}
                </p>
                {subj?.professor && height > 48 && (
                  <p className="pl-2 text-[11px] text-zinc-500 truncate">
                    {subj.professor}
                  </p>
                )}
                {isNow && (
                  <span className="absolute right-2 top-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white">
                    En curso
                  </span>
                )}
              </Link>
            );
          })}

          {nowMinutes !== null &&
            nowMinutes >= startHour * 60 &&
            nowMinutes <= endHour * 60 && (
              <div
                className="pointer-events-none absolute left-12 right-2 z-10 flex items-center gap-2"
                style={{ top: 12 + ((nowMinutes - startHour * 60) / 60) * ROW }}
              >
                <span className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]" />
                <span className="h-px flex-1 bg-red-400/60" />
              </div>
            )}
        </div>
      )}
    </div>
  );
}

function MonthlySchedule({
  year,
  month,
  setMonthCursor,
  subjectById,
  blocks,
  onPickDay,
}: {
  year: number;
  month: number;
  setMonthCursor: (c: { year: number; month: number }) => void;
  subjectById: Map<string, Subject>;
  blocks: ScheduleBlock[];
  onPickDay: (d: Date) => void;
}) {
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const daysIn = new Date(year, month + 1, 0).getDate();
    const arr: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) arr.push(null);
    for (let d = 1; d <= daysIn; d++) arr.push(new Date(year, month, d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month]);

  const blocksByDow = useMemo(() => {
    const m = new Map<number, ScheduleBlock[]>();
    for (const b of blocks) {
      const list = m.get(b.day_of_week) ?? [];
      list.push(b);
      m.set(b.day_of_week, list);
    }
    for (const list of m.values())
      list.sort((a, b) => a.start_time.localeCompare(b.start_time));
    return m;
  }, [blocks]);

  const today = new Date();
  const todayKey = toDateKey(today);

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setMonthCursor({ year: d.getFullYear(), month: d.getMonth() });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          {MONTHS[month]} {year}
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => shiftMonth(-1)}
            aria-label="Mes anterior"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-white/25 hover:text-white"
          >
            ←
          </button>
          <button
            onClick={() =>
              setMonthCursor({
                year: today.getFullYear(),
                month: today.getMonth(),
              })
            }
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-white/25 hover:text-white"
          >
            Hoy
          </button>
          <button
            onClick={() => shiftMonth(1)}
            aria-label="Mes siguiente"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-white/25 hover:text-white"
          >
            →
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        <div className="grid grid-cols-7 border-b border-white/5">
          {HEADERS_MONDAY.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-500"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            if (!d)
              return (
                <div
                  key={i}
                  className="min-h-24 border-b border-r border-white/5 bg-white/[0.01]"
                />
              );
            const key = toDateKey(d);
            const dayBlocks = blocksByDow.get(d.getDay()) ?? [];
            const isToday = key === todayKey;
            return (
              <button
                key={i}
                onClick={() => onPickDay(d)}
                className="min-h-24 border-b border-r border-white/5 p-1.5 text-left align-top transition hover:bg-white/[0.04]"
                title={`Ver día ${d.getDate()}`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    isToday
                      ? "bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white"
                      : "text-zinc-400"
                  }`}
                >
                  {d.getDate()}
                </span>
                <div className="mt-1 space-y-1">
                  {dayBlocks.slice(0, 3).map((b) => {
                    const subj = subjectById.get(b.subject_id);
                    const color = subj?.color ?? "#6366f1";
                    return (
                      <span
                        key={b.id}
                        className="block truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-tight"
                        style={{
                          backgroundColor: `${color}26`,
                          color,
                        }}
                        title={`${subj?.name ?? "?"} · ${b.start_time.slice(0, 5)}${b.room_code ? ` · ${b.room_code}` : ""}`}
                      >
                        <span className="font-mono">
                          {b.start_time.slice(0, 5)}
                        </span>{" "}
                        {subj?.name ?? "?"}
                      </span>
                    );
                  })}
                  {dayBlocks.length > 3 && (
                    <span className="block px-1.5 text-[10px] text-zinc-500">
                      +{dayBlocks.length - 3} más
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-xs text-zinc-600">
        Click en un día para abrir la vista diaria.
      </p>
    </div>
  );
}
