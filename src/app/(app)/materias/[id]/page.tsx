import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Evaluation, ScheduleBlock, Subject } from "@/lib/types";
import { formatGrade, summarizeGrades, PASSING_GRADE } from "@/lib/grades";
import { ProgressRing } from "@/components/progress-ring";
import { Sparkline } from "@/components/sparkline";
import { EditSubject } from "./edit-subject";
import { EvaluationsClient } from "./evaluations-client";
import { SubjectNotes } from "./subject-notes";

const DAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: subject } = await supabase
    .from("subjects")
    .select()
    .eq("id", id)
    .maybeSingle();
  if (!subject) notFound();

  const [{ data: evaluations }, { data: blocks }] = await Promise.all([
    supabase
      .from("evaluations")
      .select()
      .eq("subject_id", id)
      .order("created_at"),
    supabase
      .from("schedule_blocks")
      .select()
      .eq("subject_id", id)
      .order("day_of_week"),
  ]);

  const s = subject as Subject;
  const evalList = (evaluations ?? []) as Evaluation[];
  const summary = summarizeGrades(evalList);
  const gradeSeries = evalList
    .filter((e) => e.grade !== null)
    .map((e) => Number(e.grade));
  const color = s.color ?? "#6366f1";
  const ringColor =
    summary.currentAverage === null
      ? color
      : summary.currentAverage >= PASSING_GRADE
        ? color
        : "#ef4444";

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-indigo-400">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            {s.code}
            {s.group_name ? ` · Grupo ${s.group_name}` : ""}
            {s.credits ? ` · ${s.credits} créditos` : ""}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {s.name}
          </h1>
          {s.professor && (
            <p className="mt-1.5 text-sm text-zinc-400">{s.professor}</p>
          )}
        </div>
        <EditSubject subject={s} />
      </header>

      {/* Overview stats: ring + sparkline + summary */}
      <section className="mt-6 flex flex-wrap items-center gap-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <ProgressRing
          value={summary.currentAverage}
          color={ringColor}
          size={80}
          stroke={6}
          hint="promedio"
        />
        <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Acumulado
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-white">
              {formatGrade(summary.accumulated)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Tope máximo
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-emerald-300">
              {formatGrade(summary.maxAchievable)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              % evaluado
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-white">
              {summary.evaluatedPercent}%
            </p>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${summary.evaluatedPercent}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Estado
            </p>
            <p className="mt-1">
              {summary.status === "perdida" ? (
                <span className="rounded-md bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-300">
                  Perdida
                </span>
              ) : summary.status === "aprobada" ? (
                <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                  Asegurada
                </span>
              ) : (
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold text-zinc-300">
                  En curso
                </span>
              )}
            </p>
          </div>
        </div>
        {gradeSeries.length >= 2 && (
          <div className="min-w-32">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Tendencia
            </p>
            <Sparkline
              values={gradeSeries}
              width={128}
              height={40}
              color={color}
              min={0}
              max={5}
              showDots
            />
          </div>
        )}
      </section>

      {(blocks ?? []).length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {(blocks as ScheduleBlock[]).map((b) => (
            <span
              key={b.id}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-zinc-400"
            >
              {DAY_NAMES[b.day_of_week]} {b.start_time.slice(0, 5)}–
              {b.end_time.slice(0, 5)}
              {b.room_code ? ` · ${b.room_code}` : ""}
            </span>
          ))}
        </div>
      )}

      <EvaluationsClient
        subjectId={s.id}
        userId={user.id}
        initialEvaluations={(evaluations ?? []) as Evaluation[]}
      />
      <SubjectNotes subjectId={s.id} initialNotes={s.notes} />
      </main>
  );
}
