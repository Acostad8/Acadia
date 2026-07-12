import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatGrade, summarizeGrades, PASSING_GRADE } from "@/lib/grades";
import type { Evaluation, Semester, Subject } from "@/lib/types";
import { AppNav } from "@/components/app-nav";

type SubjectRow = {
  subject: Subject;
  average: number | null;
  evaluatedPercent: number;
  status: "aprobada" | "en_riesgo" | "perdida";
};

function weightedAverage(rows: SubjectRow[]): number | null {
  const graded = rows.filter((r) => r.average !== null);
  if (graded.length === 0) return null;
  const totalCredits = graded.reduce(
    (s, r) => s + (r.subject.credits ?? 1),
    0
  );
  if (totalCredits === 0) return null;
  return (
    graded.reduce(
      (s, r) => s + (r.average as number) * (r.subject.credits ?? 1),
      0
    ) / totalCredits
  );
}

export default async function AnaliticaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: semesters }, { data: subjects }, { data: evaluations }] =
    await Promise.all([
      supabase.from("semesters").select().order("created_at"),
      supabase.from("subjects").select().order("name"),
      supabase.from("evaluations").select(),
    ]);

  if (!semesters || semesters.length === 0) redirect("/onboarding");

  const allSubjects = (subjects ?? []) as Subject[];
  const allEvaluations = (evaluations ?? []) as Evaluation[];
  const allSemesters = semesters as Semester[];

  const rowsBySemester = new Map<string, SubjectRow[]>();
  for (const subject of allSubjects) {
    const summary = summarizeGrades(
      allEvaluations.filter((e) => e.subject_id === subject.id)
    );
    const row: SubjectRow = {
      subject,
      // Promedio en curso: acumulado proyectado sobre lo evaluado
      average: summary.currentAverage,
      evaluatedPercent: summary.evaluatedPercent,
      status: summary.status,
    };
    const list = rowsBySemester.get(subject.semester_id) ?? [];
    list.push(row);
    rowsBySemester.set(subject.semester_id, list);
  }

  const current = allSemesters.find((s) => s.is_current);
  const currentRows = current ? (rowsBySemester.get(current.id) ?? []) : [];
  const allRows = [...rowsBySemester.values()].flat();

  const generalAverage = weightedAverage(allRows);
  const currentAverage = weightedAverage(currentRows);
  const gradedRows = currentRows.filter((r) => r.average !== null);
  const passing = gradedRows.filter(
    (r) => (r.average as number) >= PASSING_GRADE
  ).length;
  const atRisk = gradedRows.length - passing;
  const lost = currentRows.filter((r) => r.status === "perdida").length;
  const totalCredits = currentRows.reduce(
    (s, r) => s + (r.subject.credits ?? 0),
    0
  );

  const semesterTrend = allSemesters
    .map((s) => ({
      semester: s,
      average: weightedAverage(rowsBySemester.get(s.id) ?? []),
    }))
    .filter((t) => t.average !== null);

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
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Promedio del semestre",
              value:
                currentAverage === null ? "—" : formatGrade(currentAverage),
              accent: currentAverage !== null && currentAverage >= 4,
            },
            {
              label: "Promedio general",
              value:
                generalAverage === null ? "—" : formatGrade(generalAverage),
              accent: generalAverage !== null && generalAverage >= 4,
            },
            {
              label: "Materias en verde / en rojo",
              value: gradedRows.length > 0 ? `${passing} / ${atRisk}` : "—",
              accent: false,
            },
            {
              label: "Créditos cursando",
              value: totalCredits > 0 ? totalCredits : "—",
              accent: false,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm"
            >
              <p
                className={`text-2xl font-bold tabular-nums ${
                  stat.accent
                    ? "bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent"
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

        {/* Rendimiento por materia (semestre actual) */}
        <section className="mt-10">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Rendimiento por materia
          </h2>
          {currentRows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-zinc-500">
              No hay materias en el semestre actual.
            </p>
          ) : (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              {currentRows.map((r) => (
                <div key={r.subject.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-medium text-white">
                      {r.subject.name}
                    </p>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-zinc-300">
                      {r.average === null ? "Sin notas" : formatGrade(r.average)}
                      {r.average !== null && (
                        <span className="ml-1.5 text-xs font-normal text-zinc-600">
                          {r.evaluatedPercent}% evaluado
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${((r.average ?? 0) / 5) * 100}%`,
                        backgroundColor:
                          r.average === null
                            ? "transparent"
                            : r.average >= PASSING_GRADE
                              ? (r.subject.color ?? "#6366f1")
                              : "#ef4444",
                      }}
                    />
                  </div>
                </div>
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
