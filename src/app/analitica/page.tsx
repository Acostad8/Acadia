import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  formatGrade,
  summarizeGrades,
  PASSING_GRADE,
  type GradeSummary,
} from "@/lib/grades";
import type {
  CalendarEvent,
  Evaluation,
  ScheduleBlock,
  Semester,
  Subject,
} from "@/lib/types";
import { AppNav } from "@/components/app-nav";

type SubjectRow = {
  subject: Subject;
  summary: GradeSummary;
};

const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

function weightedBy(
  rows: SubjectRow[],
  pick: (r: SubjectRow) => number | null
): number | null {
  const usable = rows
    .map((r) => ({ value: pick(r), credits: r.subject.credits ?? 1 }))
    .filter((r): r is { value: number; credits: number } => r.value !== null);
  if (usable.length === 0) return null;
  const totalCredits = usable.reduce((s, r) => s + r.credits, 0);
  if (totalCredits === 0) return null;
  return usable.reduce((s, r) => s + r.value * r.credits, 0) / totalCredits;
}

export default async function AnaliticaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: semesters },
    { data: subjects },
    { data: evaluations },
    { data: blocks },
    { data: events },
  ] = await Promise.all([
    supabase.from("semesters").select().order("created_at"),
    supabase.from("subjects").select().order("name"),
    supabase.from("evaluations").select(),
    supabase.from("schedule_blocks").select(),
    supabase.from("events").select(),
  ]);

  if (!semesters || semesters.length === 0) redirect("/onboarding");

  const allSubjects = (subjects ?? []) as Subject[];
  const allEvaluations = (evaluations ?? []) as Evaluation[];
  const allSemesters = semesters as Semester[];
  const allBlocks = (blocks ?? []) as ScheduleBlock[];
  const allEvents = (events ?? []) as CalendarEvent[];

  const rowsBySemester = new Map<string, SubjectRow[]>();
  for (const subject of allSubjects) {
    const summary = summarizeGrades(
      allEvaluations.filter((e) => e.subject_id === subject.id)
    );
    const list = rowsBySemester.get(subject.semester_id) ?? [];
    list.push({ subject, summary });
    rowsBySemester.set(subject.semester_id, list);
  }

  const current = allSemesters.find((s) => s.is_current);
  const currentRows = current ? (rowsBySemester.get(current.id) ?? []) : [];
  const allRows = [...rowsBySemester.values()].flat();

  // ── Indicadores principales ──────────────────────────────────────────
  const currentAverage = weightedBy(currentRows, (r) => r.summary.currentAverage);
  const generalAverage = weightedBy(allRows, (r) => r.summary.currentAverage);

  const totalCredits = currentRows.reduce(
    (s, r) => s + (r.subject.credits ?? 0),
    0
  );
  const securedCredits = currentRows
    .filter((r) => r.summary.status === "aprobada")
    .reduce((s, r) => s + (r.subject.credits ?? 0), 0);
  const riskCredits = currentRows
    .filter(
      (r) =>
        r.summary.status === "perdida" ||
        (r.summary.evaluatedPercent > 0 &&
          (r.summary.currentAverage ?? 5) < PASSING_GRADE)
    )
    .reduce((s, r) => s + (r.subject.credits ?? 0), 0);

  // Progreso global del semestre: % evaluado ponderado por créditos
  const semesterProgress = weightedBy(currentRows, (r) => r.summary.evaluatedPercent);

  // ── Proyecciones ─────────────────────────────────────────────────────
  const projections = [
    {
      label: "Peor caso",
      hint: "Si sacas 0.0 en todo lo que falta",
      value: weightedBy(currentRows, (r) => r.summary.accumulated),
      color: "#ef4444",
    },
    {
      label: "Ritmo actual",
      hint: "Si mantienes tu promedio en lo que falta",
      value: weightedBy(currentRows, (r) =>
        r.summary.currentAverage === null
          ? null
          : r.summary.accumulated +
            r.summary.currentAverage * (r.summary.remainingPercent / 100)
      ),
      color: "#818cf8",
    },
    {
      label: "Mejor caso",
      hint: "Si sacas 5.0 en todo lo que falta",
      value: weightedBy(currentRows, (r) => r.summary.maxAchievable),
      color: "#34d399",
    },
  ];

  // ── Distribución de notas ────────────────────────────────────────────
  const gradedEvals = currentRows
    .flatMap((r) =>
      allEvaluations.filter(
        (e) => e.subject_id === r.subject.id && e.grade !== null
      )
    )
    .map((e) => Number(e.grade));
  const buckets = [
    { label: "0–1", min: 0, max: 1 },
    { label: "1–2", min: 1, max: 2 },
    { label: "2–3", min: 2, max: 3 },
    { label: "3–4", min: 3, max: 4 },
    { label: "4–4.5", min: 4, max: 4.5 },
    { label: "4.5–5", min: 4.5, max: 5.01 },
  ].map((b) => ({
    ...b,
    count: gradedEvals.filter((g) => g >= b.min && g < b.max).length,
  }));
  const maxBucket = Math.max(1, ...buckets.map((b) => b.count));

  // ── Carga semanal (horas por día) ────────────────────────────────────
  const currentSubjectIds = new Set(currentRows.map((r) => r.subject.id));
  const hoursByDay = [1, 2, 3, 4, 5, 6, 0].map((dow, i) => {
    const hours = allBlocks
      .filter((b) => currentSubjectIds.has(b.subject_id) && b.day_of_week === dow)
      .reduce((s, b) => {
        const [sh, sm] = b.start_time.split(":").map(Number);
        const [eh, em] = b.end_time.split(":").map(Number);
        return s + (eh * 60 + em - sh * 60 - sm) / 60;
      }, 0);
    return { label: DAY_LABELS[i], hours };
  });
  const maxHours = Math.max(1, ...hoursByDay.map((d) => d.hours));

  // ── Entregas ─────────────────────────────────────────────────────────
  const semesterEvents = current
    ? allEvents.filter((e) => e.semester_id === current.id)
    : [];
  const completedEvents = semesterEvents.filter((e) => e.completed).length;
  const overdueEvents = semesterEvents.filter(
    (e) => !e.completed && new Date(e.due_at).getTime() < new Date().getTime()
  ).length;
  const pendingEvents = semesterEvents.length - completedEvents - overdueEvents;

  // ── Ranking ──────────────────────────────────────────────────────────
  const graded = currentRows.filter((r) => r.summary.currentAverage !== null);
  const sorted = [...graded].sort(
    (a, b) =>
      (b.summary.currentAverage as number) - (a.summary.currentAverage as number)
  );
  const best = sorted[0];
  const worst = sorted.length > 1 ? sorted[sorted.length - 1] : undefined;

  // ── Evolución ────────────────────────────────────────────────────────
  const semesterTrend = allSemesters
    .map((s) => ({
      semester: s,
      average: weightedBy(rowsBySemester.get(s.id) ?? [], (r) => r.summary.currentAverage),
    }))
    .filter((t) => t.average !== null);

  const lost = currentRows.filter((r) => r.summary.status === "perdida").length;

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <header>
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-indigo-400">
            {current ? (current.label ?? current.name) : "Acadia"}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Analítica académica
          </h1>
        </header>

        {/* Indicadores */}
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-6">
          {[
            {
              label: "Promedio semestre",
              value: currentAverage === null ? "—" : formatGrade(currentAverage),
              accent: currentAverage !== null && currentAverage >= PASSING_GRADE,
              danger: currentAverage !== null && currentAverage < PASSING_GRADE,
            },
            {
              label: "Promedio general",
              value: generalAverage === null ? "—" : formatGrade(generalAverage),
              accent: false,
              danger: false,
            },
            {
              label: "Semestre evaluado",
              value:
                semesterProgress === null
                  ? "—"
                  : `${Math.round(semesterProgress)}%`,
              accent: false,
              danger: false,
            },
            {
              label: "Créditos cursando",
              value: totalCredits > 0 ? totalCredits : "—",
              accent: false,
              danger: false,
            },
            {
              label: "Créditos asegurados",
              value: totalCredits > 0 ? securedCredits : "—",
              accent: securedCredits > 0,
              danger: false,
            },
            {
              label: "Créditos en riesgo",
              value: totalCredits > 0 ? riskCredits : "—",
              accent: false,
              danger: riskCredits > 0,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm"
            >
              <p
                className={`text-2xl font-bold tabular-nums ${
                  stat.danger
                    ? "text-red-400"
                    : stat.accent
                      ? "text-emerald-400"
                      : "text-white"
                }`}
              >
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {lost > 0 && (
          <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {lost === 1
              ? "Tienes 1 materia perdida matemáticamente."
              : `Tienes ${lost} materias perdidas matemáticamente.`}
          </p>
        )}

        {/* Proyecciones + destacadas */}
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Proyección del semestre
            </h2>
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              {projections.map((p) => (
                <div key={p.label}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <div>
                      <span className="text-sm font-medium text-white">
                        {p.label}
                      </span>
                      <span className="ml-2 text-xs text-zinc-600">
                        {p.hint}
                      </span>
                    </div>
                    <span
                      className="text-lg font-bold tabular-nums"
                      style={{ color: p.color }}
                    >
                      {p.value === null ? "—" : formatGrade(p.value)}
                    </span>
                  </div>
                  <div className="relative h-2.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${((p.value ?? 0) / 5) * 100}%`,
                        backgroundColor: p.color,
                      }}
                    />
                    {/* Línea de aprobación en 3.0 */}
                    <span className="absolute inset-y-0 left-[60%] w-px bg-white/40" />
                  </div>
                </div>
              ))}
              <p className="text-xs text-zinc-600">
                La línea vertical marca 3.0 (nota de aprobación). Ponderado por
                créditos e incluye materias sin notas.
              </p>
            </div>

            {/* Distribución de notas */}
            <h2 className="mb-3 mt-8 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Distribución de tus notas
            </h2>
            {gradedEvals.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-zinc-500">
                Registra notas en tus materias para ver la distribución.
              </p>
            ) : (
              <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                {buckets.map((b) => (
                  <div
                    key={b.label}
                    className="flex flex-1 flex-col items-center gap-1.5"
                  >
                    <span className="text-xs font-semibold tabular-nums text-zinc-300">
                      {b.count > 0 ? b.count : ""}
                    </span>
                    <div className="flex h-24 w-full items-end">
                      <div
                        className={`w-full rounded-t-md ${
                          b.min >= 3
                            ? "bg-gradient-to-t from-emerald-600/70 to-emerald-400/70"
                            : "bg-gradient-to-t from-red-600/60 to-red-400/60"
                        }`}
                        style={{
                          height: `${(b.count / maxBucket) * 100}%`,
                          minHeight: b.count > 0 ? "4px" : "0",
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-500">{b.label}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Columna lateral */}
          <aside className="space-y-6">
            {/* Materias destacadas */}
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Materias destacadas
              </h2>
              <div className="space-y-2">
                {best ? (
                  <Link
                    href={`/materias/${best.subject.id}`}
                    className="block rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 transition hover:border-emerald-500/40"
                  >
                    <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-400">
                      Tu mejor materia
                    </p>
                    <p className="mt-1 flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-white">
                        {best.subject.name}
                      </span>
                      <span className="text-lg font-bold tabular-nums text-emerald-400">
                        {formatGrade(best.summary.currentAverage as number)}
                      </span>
                    </p>
                  </Link>
                ) : (
                  <p className="rounded-2xl border border-dashed border-white/15 p-4 text-center text-xs text-zinc-500">
                    Sin notas registradas aún.
                  </p>
                )}
                {worst && (
                  <Link
                    href={`/materias/${worst.subject.id}`}
                    className={`block rounded-2xl border p-4 transition ${
                      (worst.summary.currentAverage as number) < PASSING_GRADE
                        ? "border-red-500/20 bg-red-500/[0.06] hover:border-red-500/40"
                        : "border-white/10 bg-white/[0.03] hover:border-white/25"
                    }`}
                  >
                    <p
                      className={`text-[11px] font-medium uppercase tracking-wider ${
                        (worst.summary.currentAverage as number) < PASSING_GRADE
                          ? "text-red-400"
                          : "text-zinc-500"
                      }`}
                    >
                      Necesita más atención
                    </p>
                    <p className="mt-1 flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-white">
                        {worst.subject.name}
                      </span>
                      <span
                        className={`text-lg font-bold tabular-nums ${
                          (worst.summary.currentAverage as number) <
                          PASSING_GRADE
                            ? "text-red-400"
                            : "text-white"
                        }`}
                      >
                        {formatGrade(worst.summary.currentAverage as number)}
                      </span>
                    </p>
                  </Link>
                )}
              </div>
            </div>

            {/* Carga semanal */}
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Carga semanal de clases
              </h2>
              <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                {hoursByDay.map((d) => (
                  <div
                    key={d.label}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <span className="text-[10px] tabular-nums text-zinc-400">
                      {d.hours > 0 ? `${d.hours}h` : ""}
                    </span>
                    <div className="flex h-16 w-full items-end">
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-indigo-600 to-violet-500"
                        style={{
                          height: `${(d.hours / maxHours) * 100}%`,
                          minHeight: d.hours > 0 ? "3px" : "0",
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-500">{d.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Entregas */}
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Entregas del semestre
              </h2>
              {semesterEvents.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/15 p-4 text-center text-xs text-zinc-500">
                  Sin eventos en el calendario.
                </p>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="bg-emerald-500"
                      style={{
                        width: `${(completedEvents / semesterEvents.length) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-red-500"
                      style={{
                        width: `${(overdueEvents / semesterEvents.length) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-zinc-600"
                      style={{
                        width: `${(pendingEvents / semesterEvents.length) * 100}%`,
                      }}
                    />
                  </div>
                  <ul className="mt-3 space-y-1.5 text-xs">
                    <li className="flex items-center justify-between text-zinc-400">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Completadas
                      </span>
                      <span className="font-semibold tabular-nums text-white">
                        {completedEvents}
                      </span>
                    </li>
                    <li className="flex items-center justify-between text-zinc-400">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        Vencidas sin completar
                      </span>
                      <span className="font-semibold tabular-nums text-white">
                        {overdueEvents}
                      </span>
                    </li>
                    <li className="flex items-center justify-between text-zinc-400">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-zinc-600" />
                        Pendientes
                      </span>
                      <span className="font-semibold tabular-nums text-white">
                        {pendingEvents}
                      </span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Rendimiento por materia */}
        <section className="mt-10">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Rendimiento por materia
          </h2>
          {currentRows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-zinc-500">
              No hay materias en el semestre actual.
            </p>
          ) : (
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              {currentRows.map(({ subject, summary }) => (
                <Link
                  key={subject.id}
                  href={`/materias/${subject.id}`}
                  className="block rounded-xl p-2 transition hover:bg-white/[0.03]"
                >
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-white">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: subject.color ?? "#6366f1" }}
                      />
                      <span className="truncate">{subject.name}</span>
                      {summary.status === "perdida" && (
                        <span className="shrink-0 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-300">
                          Perdida
                        </span>
                      )}
                      {summary.status === "aprobada" && (
                        <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                          Asegurada
                        </span>
                      )}
                    </p>
                    <p className="shrink-0 text-sm tabular-nums text-zinc-300">
                      {summary.currentAverage === null ? (
                        <span className="text-zinc-600">Sin notas</span>
                      ) : (
                        <>
                          <span className="font-semibold text-white">
                            {formatGrade(summary.currentAverage)}
                          </span>
                          <span className="ml-2 text-xs text-zinc-600">
                            {summary.evaluatedPercent}% evaluado · tope{" "}
                            {formatGrade(summary.maxAchievable)}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="relative h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${((summary.currentAverage ?? 0) / 5) * 100}%`,
                        backgroundColor:
                          summary.currentAverage === null
                            ? "transparent"
                            : summary.currentAverage >= PASSING_GRADE
                              ? (subject.color ?? "#6366f1")
                              : "#ef4444",
                      }}
                    />
                    <span className="absolute inset-y-0 left-[60%] w-px bg-white/30" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Evolución por semestre */}
        {semesterTrend.length > 1 && (
          <section className="mt-10 pb-10">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Evolución por semestre
            </h2>
            <div className="flex items-end gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              {semesterTrend.map(({ semester, average }) => (
                <div
                  key={semester.id}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <span className="text-sm font-semibold tabular-nums text-white">
                    {formatGrade(average as number)}
                  </span>
                  <div className="flex h-32 w-full max-w-16 items-end">
                    <div
                      className={`w-full rounded-t-lg ${
                        semester.is_current
                          ? "bg-gradient-to-t from-indigo-600 to-violet-500"
                          : "bg-white/15"
                      }`}
                      style={{ height: `${((average as number) / 5) * 100}%` }}
                    />
                  </div>
                  <span className="truncate text-xs text-zinc-500">
                    {semester.label ?? semester.name}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
