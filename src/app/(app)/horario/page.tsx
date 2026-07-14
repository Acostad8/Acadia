import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ScheduleBlock, Subject } from "@/lib/types";
import { HorarioClient } from "./horario-client";

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function countConflicts(blocks: ScheduleBlock[]): number {
  const byDay = new Map<number, ScheduleBlock[]>();
  for (const b of blocks) {
    const list = byDay.get(b.day_of_week) ?? [];
    list.push(b);
    byDay.set(b.day_of_week, list);
  }
  let count = 0;
  for (const list of byDay.values()) {
    const sorted = [...list].sort(
      (a, b) => toMinutes(a.start_time) - toMinutes(b.start_time)
    );
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (toMinutes(sorted[j].start_time) >= toMinutes(sorted[i].end_time))
          break;
        count += 1;
      }
    }
  }
  return count;
}

export default async function HorarioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: semester } = await supabase
    .from("semesters")
    .select()
    .eq("is_current", true)
    .maybeSingle();
  if (!semester) redirect("/onboarding");

  const { data: subjects } = await supabase
    .from("subjects")
    .select()
    .eq("semester_id", semester.id)
    .order("name");

  const ids = (subjects ?? []).map((s) => s.id);
  const { data: blocks } = ids.length
    ? await supabase.from("schedule_blocks").select().in("subject_id", ids)
    : { data: [] as ScheduleBlock[] };

  const allBlocks = (blocks ?? []) as ScheduleBlock[];

  const totalMinutes = allBlocks.reduce(
    (sum, b) => sum + (toMinutes(b.end_time) - toMinutes(b.start_time)),
    0
  );
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

  const minutesByDay = new Map<number, number>();
  for (const b of allBlocks) {
    minutesByDay.set(
      b.day_of_week,
      (minutesByDay.get(b.day_of_week) ?? 0) +
        (toMinutes(b.end_time) - toMinutes(b.start_time))
    );
  }
  let peakDayIdx = -1;
  let peakMinutes = 0;
  for (const [dow, mins] of minutesByDay) {
    if (mins > peakMinutes) {
      peakMinutes = mins;
      peakDayIdx = dow;
    }
  }
  const peakLabel =
    peakDayIdx > 0 && peakDayIdx <= 6 ? DAY_LABELS[peakDayIdx - 1] : "—";

  const conflicts = countConflicts(allBlocks);
  const activeDays = minutesByDay.size;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Horario
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {semester.label ?? semester.name}
          </p>
        </div>
      </header>

      {allBlocks.length > 0 && (
        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 print:hidden">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Horas semana
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-white">
              {totalHours}
              <span className="ml-1 text-sm font-normal text-zinc-500">h</span>
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Día más cargado
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-white">
              {peakLabel}
              <span className="ml-1 text-sm font-normal text-zinc-500">
                {peakMinutes > 0
                  ? ` · ${Math.round((peakMinutes / 60) * 10) / 10}h`
                  : ""}
              </span>
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Días activos
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-white">
              {activeDays}
              <span className="ml-1 text-sm font-normal text-zinc-500">/6</span>
            </p>
          </div>
          <div
            className={`rounded-2xl border p-4 ${
              conflicts > 0
                ? "border-red-500/30 bg-red-500/[0.05]"
                : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <p
              className={`text-[10px] font-semibold uppercase tracking-widest ${
                conflicts > 0 ? "text-red-400" : "text-zinc-500"
              }`}
            >
              Conflictos
            </p>
            <p
              className={`mt-1 text-2xl font-bold tabular-nums ${
                conflicts > 0 ? "text-red-300" : "text-white"
              }`}
            >
              {conflicts}
              {conflicts > 0 && (
                <span className="ml-1 text-sm font-normal text-red-400">⚠</span>
              )}
            </p>
          </div>
        </section>
      )}

      <HorarioClient
        subjects={(subjects ?? []) as Subject[]}
        blocks={allBlocks}
      />
    </main>
  );
}
