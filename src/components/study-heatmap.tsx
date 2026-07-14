type Session = {
  started_at: string;
  duration_minutes: number;
};

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatHours(minutes: number): string {
  if (minutes === 0) return "0m";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const MONTH_LABELS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export function StudyHeatmap({
  sessions,
  weeks = 12,
  title = "Actividad de estudio",
}: {
  sessions: Session[];
  weeks?: number;
  title?: string;
}) {
  const byDay = new Map<string, number>();
  for (const s of sessions) {
    const k = toDateKey(new Date(s.started_at));
    byDay.set(k, (byDay.get(k) ?? 0) + s.duration_minutes);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  const dayOfWeekMon = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dayOfWeekMon - (weeks - 1) * 7);

  const grid: { date: string; minutes: number; month: number }[][] = [];
  let maxMinutes = 0;
  for (let w = 0; w < weeks; w++) {
    const week: { date: string; minutes: number; month: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + w * 7 + d);
      const key = toDateKey(day);
      const minutes = byDay.get(key) ?? 0;
      if (minutes > maxMinutes) maxMinutes = minutes;
      week.push({ date: key, minutes, month: day.getMonth() });
    }
    grid.push(week);
  }

  const totalMinutes = grid.flat().reduce((s, d) => s + d.minutes, 0);
  const activeDays = grid.flat().filter((d) => d.minutes > 0).length;

  const monthLabels: { week: number; label: string }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < grid.length; w++) {
    const firstDayMonth = grid[w][0].month;
    if (firstDayMonth !== lastMonth) {
      monthLabels.push({ week: w, label: MONTH_LABELS[firstDayMonth] });
      lastMonth = firstDayMonth;
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          {title}
        </h2>
        <p className="text-[11px] text-zinc-600">
          <span className="text-zinc-300">{formatHours(totalMinutes)}</span>
          <span className="mx-1.5">·</span>
          <span className="text-zinc-300">{activeDays}</span> días activos
        </p>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1">
          <div className="flex gap-1 pl-6 text-[9px] uppercase text-zinc-600">
            {monthLabels.map((m) => {
              const nextIdx =
                monthLabels[monthLabels.indexOf(m) + 1]?.week ?? grid.length;
              const span = nextIdx - m.week;
              return (
                <span
                  key={m.week}
                  className="text-left"
                  style={{ width: `${span * 16}px` }}
                >
                  {m.label}
                </span>
              );
            })}
          </div>
          <div className="flex gap-1">
            <div className="flex flex-col justify-around pr-1 text-[9px] uppercase text-zinc-600">
              <span>L</span>
              <span>M</span>
              <span>X</span>
              <span>J</span>
              <span>V</span>
              <span>S</span>
              <span>D</span>
            </div>
            {grid.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day) => {
                  const intensity =
                    day.minutes === 0
                      ? 0
                      : Math.min(
                          4,
                          Math.ceil((day.minutes / Math.max(1, maxMinutes)) * 4)
                        );
                  const bg = [
                    "bg-white/[0.04]",
                    "bg-emerald-500/20",
                    "bg-emerald-500/45",
                    "bg-emerald-500/70",
                    "bg-emerald-400",
                  ][intensity];
                  return (
                    <div
                      key={day.date}
                      title={`${day.date} · ${formatHours(day.minutes)}`}
                      className={`h-3 w-3 rounded-sm ${bg} transition-transform hover:scale-125`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-zinc-600">
        <span>menos</span>
        <span className="h-2.5 w-2.5 rounded-sm bg-white/[0.04]" />
        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/20" />
        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/45" />
        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/70" />
        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
        <span>más</span>
      </div>
    </div>
  );
}
