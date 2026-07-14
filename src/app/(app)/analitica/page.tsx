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
  StudySession,
} from "@/lib/types";
import { StudyHeatmap } from "@/components/study-heatmap";

type SubjectRow = {
  subject: Subject;
  summary: GradeSummary;
};

const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];
const DAY_LABELS_FULL = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
];

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

function subjectSparklinePath(
  values: number[],
  width: number,
  height: number
): string {
  if (values.length === 0) return "";
  if (values.length === 1) {
    const y = height - (values[0] / 5) * height;
    return `M 0 ${y} L ${width} ${y}`;
  }
  const step = width / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * step;
      const y = height - (v / 5) * height;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export default async function AnaliticaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const studySince84 = new Date();
  studySince84.setDate(studySince84.getDate() - 84);

  const [
    { data: semesters },
    { data: subjects },
    { data: evaluations },
    { data: blocks },
    { data: events },
    { data: studySessions },
  ] = await Promise.all([
    supabase.from("semesters").select().order("created_at"),
    supabase.from("subjects").select().order("name"),
    supabase.from("evaluations").select().order("created_at"),
    supabase.from("schedule_blocks").select(),
    supabase.from("events").select(),
    supabase
      .from("study_sessions")
      .select("started_at,duration_minutes,subject_id")
      .gte("started_at", studySince84.toISOString()),
  ]);

  if (!semesters || semesters.length === 0) redirect("/onboarding");

  const allSubjects = (subjects ?? []) as Subject[];
  const allEvaluations = (evaluations ?? []) as Evaluation[];
  const allSemesters = semesters as Semester[];
  const allBlocks = (blocks ?? []) as ScheduleBlock[];
  const allEvents = (events ?? []) as CalendarEvent[];
  const allSessions = (studySessions ?? []) as Pick<
    StudySession,
    "started_at" | "duration_minutes" | "subject_id"
  >[];

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

  const semesterProgress = weightedBy(currentRows, (r) => r.summary.evaluatedPercent);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const studyMinutesWeek = allSessions
    .filter((s) => new Date(s.started_at) >= weekAgo)
    .reduce((s, x) => s + x.duration_minutes, 0);

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

  const semesterEvents = current
    ? allEvents.filter((e) => e.semester_id === current.id)
    : [];
  const completedEvents = semesterEvents.filter((e) => e.completed).length;
  const overdueEvents = semesterEvents.filter(
    (e) => !e.completed && new Date(e.due_at).getTime() < new Date().getTime()
  ).length;
  const pendingEvents = semesterEvents.length - completedEvents - overdueEvents;

  const graded = currentRows.filter((r) => r.summary.currentAverage !== null);
  const sorted = [...graded].sort(
    (a, b) =>
      (b.summary.currentAverage as number) - (a.summary.currentAverage as number)
  );
  const best = sorted[0];
  const worst = sorted.length > 1 ? sorted[sorted.length - 1] : undefined;

  const semesterTrend = allSemesters
    .map((s) => ({
      semester: s,
      average: weightedBy(rowsBySemester.get(s.id) ?? [], (r) => r.summary.currentAverage),
    }))
    .filter((t) => t.average !== null) as {
    semester: Semester;
    average: number;
  }[];

  const lost = currentRows.filter((r) => r.summary.status === "perdida").length;

  // ── Insights automáticos ────────────────────────────────────────────
  const insights: {
    label: string;
    value: string;
    hint: string;
    tone: "positive" | "negative" | "neutral";
  }[] = [];

  // Día más productivo (por minutos estudio)
  if (allSessions.length > 0) {
    const perDow = [0, 0, 0, 0, 0, 0, 0];
    for (const s of allSessions) {
      const d = new Date(s.started_at);
      const dow = (d.getDay() + 6) % 7;
      perDow[dow] += s.duration_minutes;
    }
    const maxDowIdx = perDow.indexOf(Math.max(...perDow));
    if (perDow[maxDowIdx] > 0) {
      insights.push({
        label: "Día más productivo",
        value:
          DAY_LABELS_FULL[maxDowIdx].charAt(0).toUpperCase() +
          DAY_LABELS_FULL[maxDowIdx].slice(1),
        hint: `${Math.round(perDow[maxDowIdx] / 60)}h estudiadas en total`,
        tone: "positive",
      });
    }
  }

  // Hora más activa (por bloque horario 4h)
  if (allSessions.length > 0) {
    const perBlock = [0, 0, 0, 0, 0, 0];
    const blockLabels = [
      "12am–4am",
      "4am–8am",
      "8am–12pm",
      "12pm–4pm",
      "4pm–8pm",
      "8pm–12am",
    ];
    for (const s of allSessions) {
      const h = new Date(s.started_at).getHours();
      perBlock[Math.floor(h / 4)] += s.duration_minutes;
    }
    const maxBlockIdx = perBlock.indexOf(Math.max(...perBlock));
    if (perBlock[maxBlockIdx] > 0) {
      insights.push({
        label: "Franja horaria favorita",
        value: blockLabels[maxBlockIdx],
        hint: "Cuando más rindes",
        tone: "neutral",
      });
    }
  }

  // Materia con mayor mejora / caída (compara promedio primera mitad vs segunda mitad de sus evaluaciones)
  let bestDelta: { subject: Subject; delta: number } | null = null;
  let worstDelta: { subject: Subject; delta: number } | null = null;
  for (const row of currentRows) {
    const evals = allEvaluations
      .filter((e) => e.subject_id === row.subject.id && e.grade !== null)
      .map((e) => Number(e.grade));
    if (evals.length < 4) continue;
    const mid = Math.floor(evals.length / 2);
    const first = evals.slice(0, mid);
    const second = evals.slice(mid);
    const avgFirst = first.reduce((s, v) => s + v, 0) / first.length;
    const avgSecond = second.reduce((s, v) => s + v, 0) / second.length;
    const delta = avgSecond - avgFirst;
    if (!bestDelta || delta > bestDelta.delta)
      bestDelta = { subject: row.subject, delta };
    if (!worstDelta || delta < worstDelta.delta)
      worstDelta = { subject: row.subject, delta };
  }
  if (bestDelta && bestDelta.delta > 0.15) {
    insights.push({
      label: "Mayor mejora",
      value: bestDelta.subject.name,
      hint: `+${bestDelta.delta.toFixed(2)} vs. inicio del semestre`,
      tone: "positive",
    });
  }
  if (worstDelta && worstDelta.delta < -0.15) {
    insights.push({
      label: "Mayor caída",
      value: worstDelta.subject.name,
      hint: `${worstDelta.delta.toFixed(2)} vs. inicio del semestre`,
      tone: "negative",
    });
  }

  // Próxima entrega vencida
  const upcomingOverdue = semesterEvents
    .filter(
      (e) => !e.completed && new Date(e.due_at).getTime() < Date.now()
    )
    .sort(
      (a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
    )[0];
  if (upcomingOverdue) {
    const daysLate = Math.floor(
      (Date.now() - new Date(upcomingOverdue.due_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    insights.push({
      label: "Entrega vencida",
      value: upcomingOverdue.title,
      hint: daysLate === 0 ? "Vence hoy" : `Hace ${daysLate}d`,
      tone: "negative",
    });
  }

  // Sparklines por materia
  const sparklines = new Map<string, string>();
  for (const row of currentRows) {
    const values = allEvaluations
      .filter((e) => e.subject_id === row.subject.id && e.grade !== null)
      .map((e) => Number(e.grade));
    if (values.length >= 2) {
      sparklines.set(row.subject.id, subjectSparklinePath(values, 80, 24));
    }
  }

  return (
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
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-7">
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
          {
            label: "Estudio esta semana",
            value:
              studyMinutesWeek > 0
                ? studyMinutesWeek >= 60
                  ? `${Math.round(studyMinutesWeek / 6) / 10}h`
                  : `${studyMinutesWeek}m`
                : "—",
            accent: studyMinutesWeek >= 300,
            danger: false,
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

      {/* Insights automáticos */}
      {insights.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Insights automáticos
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {insights.map((ins) => {
              const toneClass =
                ins.tone === "positive"
                  ? "border-emerald-500/25 bg-emerald-500/[0.05]"
                  : ins.tone === "negative"
                    ? "border-red-500/25 bg-red-500/[0.05]"
                    : "border-white/10 bg-white/[0.03]";
              const labelClass =
                ins.tone === "positive"
                  ? "text-emerald-400"
                  : ins.tone === "negative"
                    ? "text-red-400"
                    : "text-indigo-400";
              return (
                <div
                  key={ins.label}
                  className={`rounded-2xl border p-4 backdrop-blur-sm ${toneClass}`}
                >
                  <p
                    className={`text-[10px] font-semibold uppercase tracking-widest ${labelClass}`}
                  >
                    {ins.label}
                  </p>
                  <p className="mt-2 truncate text-base font-semibold text-white">
                    {ins.value}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{ins.hint}</p>
                </div>
              );
            })}
          </div>
        </section>
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
                      className={`w-full rounded-t-md transition-all ${
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

      {/* Heatmap de estudio */}
      <section className="mt-10">
        {allSessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center">
            <p className="text-sm text-zinc-500">
              Sin sesiones de estudio en los últimos 84 días.
            </p>
            <Link
              href="/estudio"
              className="mt-3 inline-block text-xs font-medium text-indigo-400 hover:text-indigo-300"
            >
              Iniciar sesión de estudio →
            </Link>
          </div>
        ) : (
          <StudyHeatmap
            sessions={allSessions}
            weeks={12}
            title="Actividad de estudio · 12 semanas"
          />
        )}
      </section>

      {/* Rendimiento por materia con sparklines */}
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
            {currentRows.map(({ subject, summary }) => {
              const spark = sparklines.get(subject.id);
              const color = subject.color ?? "#6366f1";
              return (
                <Link
                  key={subject.id}
                  href={`/materias/${subject.id}`}
                  className="block rounded-xl p-2 transition hover:bg-white/[0.03]"
                >
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-white">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
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
                    <div className="flex shrink-0 items-center gap-3">
                      {spark && (
                        <svg
                          width="80"
                          height="24"
                          viewBox="0 0 80 24"
                          aria-hidden
                          className="opacity-70"
                        >
                          <path
                            d={spark}
                            fill="none"
                            stroke={color}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                      <p className="text-sm tabular-nums text-zinc-300">
                        {summary.currentAverage === null ? (
                          <span className="text-zinc-600">Sin notas</span>
                        ) : (
                          <>
                            <span className="font-semibold text-white">
                              {formatGrade(summary.currentAverage)}
                            </span>
                            <span className="ml-2 text-xs text-zinc-600">
                              {summary.evaluatedPercent}% · tope{" "}
                              {formatGrade(summary.maxAchievable)}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="relative h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${((summary.currentAverage ?? 0) / 5) * 100}%`,
                        backgroundColor:
                          summary.currentAverage === null
                            ? "transparent"
                            : summary.currentAverage >= PASSING_GRADE
                              ? color
                              : "#ef4444",
                      }}
                    />
                    <span className="absolute inset-y-0 left-[60%] w-px bg-white/30" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Evolución por semestre - line chart */}
      {semesterTrend.length > 1 && (
        <section className="mt-10 pb-10">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Evolución por semestre
          </h2>
          <SemesterLineChart trend={semesterTrend} />
        </section>
      )}
    </main>
  );
}

function SemesterLineChart({
  trend,
}: {
  trend: { semester: Semester; average: number }[];
}) {
  const W = 720;
  const H = 200;
  const PAD_L = 32;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 32;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const step = trend.length > 1 ? chartW / (trend.length - 1) : 0;
  const yFor = (v: number) => PAD_T + chartH - (v / 5) * chartH;
  const xFor = (i: number) => PAD_L + i * step;

  const points = trend.map((t, i) => ({
    x: xFor(i),
    y: yFor(t.average),
    ...t,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(PAD_T + chartH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(PAD_T + chartH).toFixed(1)} Z`
      : "";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Evolución del promedio por semestre"
      >
        <defs>
          <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines horizontales en 0, 1, 2, 3, 4, 5 */}
        {[0, 1, 2, 3, 4, 5].map((v) => {
          const y = yFor(v);
          return (
            <g key={v}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={y}
                y2={y}
                stroke={v === 3 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)"}
                strokeDasharray={v === 3 ? "4 4" : undefined}
              />
              <text
                x={PAD_L - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-zinc-600"
                style={{ fontSize: 9 }}
              >
                {v}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#area-grad)" />
        <path
          d={linePath}
          fill="none"
          stroke="#818cf8"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p) => (
          <g key={p.semester.id}>
            <circle
              cx={p.x}
              cy={p.y}
              r="4"
              fill={p.semester.is_current ? "#a78bfa" : "#818cf8"}
              stroke="#0a0a0a"
              strokeWidth="2"
            >
              <title>
                {p.semester.label ?? p.semester.name}:{" "}
                {formatGrade(p.average)}
              </title>
            </circle>
            <text
              x={p.x}
              y={p.y - 10}
              textAnchor="middle"
              className="fill-white font-semibold"
              style={{ fontSize: 10 }}
            >
              {formatGrade(p.average)}
            </text>
          </g>
        ))}

        {points.map((p) => (
          <text
            key={`lbl-${p.semester.id}`}
            x={p.x}
            y={H - PAD_B + 18}
            textAnchor="middle"
            className={
              p.semester.is_current ? "fill-indigo-400" : "fill-zinc-500"
            }
            style={{ fontSize: 10 }}
          >
            {(p.semester.label ?? p.semester.name).slice(0, 12)}
          </text>
        ))}
      </svg>
    </div>
  );
}
