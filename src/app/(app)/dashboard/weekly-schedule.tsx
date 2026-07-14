import type { ScheduleBlock, Subject } from "@/lib/types";

const DAYS = [
  { n: 1, label: "Lunes" },
  { n: 2, label: "Martes" },
  { n: 3, label: "Miércoles" },
  { n: 4, label: "Jueves" },
  { n: 5, label: "Viernes" },
  { n: 6, label: "Sábado" },
];

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function findConflicts(blocks: ScheduleBlock[]): Set<string> {
  const conflicting = new Set<string>();
  const byDay = new Map<number, ScheduleBlock[]>();
  for (const b of blocks) {
    const list = byDay.get(b.day_of_week) ?? [];
    list.push(b);
    byDay.set(b.day_of_week, list);
  }
  for (const list of byDay.values()) {
    const sorted = [...list].sort(
      (a, b) => toMinutes(a.start_time) - toMinutes(b.start_time)
    );
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (toMinutes(sorted[j].start_time) >= toMinutes(sorted[i].end_time))
          break;
        conflicting.add(sorted[i].id);
        conflicting.add(sorted[j].id);
      }
    }
  }
  return conflicting;
}

export function WeeklySchedule({
  subjects,
  blocks,
}: {
  subjects: Subject[];
  blocks: ScheduleBlock[];
}) {
  if (blocks.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-zinc-500">
        Sin bloques de horario registrados.
      </p>
    );
  }

  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const conflicts = findConflicts(blocks);
  const startHour = Math.min(
    ...blocks.map((b) => Math.floor(toMinutes(b.start_time) / 60))
  );
  const endHour = Math.max(
    ...blocks.map((b) => Math.ceil(toMinutes(b.end_time) / 60))
  );
  const hours = endHour - startHour;
  const ROW_PX = 52;

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm">
      <div className="grid min-w-[720px] grid-cols-[56px_repeat(6,1fr)]">
        <div className="border-b border-white/10" />
        {DAYS.map((d) => (
          <div
            key={d.n}
            className="border-b border-l border-white/10 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-400"
          >
            {d.label}
          </div>
        ))}

        {/* Columna de horas */}
        <div className="relative" style={{ height: hours * ROW_PX }}>
          {Array.from({ length: hours }, (_, i) => (
            <div
              key={i}
              className="absolute right-2 font-mono text-[10px] text-zinc-600"
              style={{ top: i * ROW_PX - 6 }}
            >
              {i > 0 && `${String(startHour + i).padStart(2, "0")}:00`}
            </div>
          ))}
        </div>

        {DAYS.map((d) => (
          <div
            key={d.n}
            className="relative border-l border-white/10"
            style={{ height: hours * ROW_PX }}
          >
            {Array.from({ length: hours }, (_, i) => (
              <div
                key={i}
                className="absolute w-full border-t border-white/5"
                style={{ top: i * ROW_PX }}
              />
            ))}
            {blocks
              .filter((b) => b.day_of_week === d.n)
              .map((b) => {
                const subject = subjectById.get(b.subject_id);
                const color = subject?.color ?? "#6366f1";
                const top =
                  ((toMinutes(b.start_time) - startHour * 60) / 60) * ROW_PX;
                const height =
                  ((toMinutes(b.end_time) - toMinutes(b.start_time)) / 60) *
                  ROW_PX;
                const isConflict = conflicts.has(b.id);
                return (
                  <div
                    key={b.id}
                    className={`absolute inset-x-1.5 overflow-hidden rounded-lg border px-2.5 py-1.5 backdrop-blur-sm ${
                      isConflict ? "ring-2 ring-red-500/60" : ""
                    }`}
                    style={{
                      top: top + 2,
                      height: height - 4,
                      backgroundColor: `${color}26`,
                      borderColor: isConflict ? "#ef4444" : `${color}59`,
                    }}
                    title={
                      isConflict
                        ? `⚠ Conflicto: se cruza con otro bloque. ${b.room_description ?? ""}`
                        : (b.room_description ?? undefined)
                    }
                  >
                    <span
                      className="absolute inset-y-0 left-0 w-[3px]"
                      style={{ backgroundColor: isConflict ? "#ef4444" : color }}
                    />
                    {isConflict && (
                      <span className="absolute right-1 top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        !
                      </span>
                    )}
                    <p className="truncate pl-1 text-[11px] font-semibold leading-tight text-white">
                      {subject?.name ?? "?"}
                    </p>
                    <p className="pl-1 font-mono text-[10px] text-zinc-400">
                      {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                      {b.room_code ? ` · ${b.room_code}` : ""}
                    </p>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}
