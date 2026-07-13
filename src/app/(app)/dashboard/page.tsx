import Link from "next/link";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { relativeDue } from "@/lib/dates";
import { formatGrade, summarizeGrades } from "@/lib/grades";
import { computeStreak } from "@/lib/streak";
import type {
  CalendarEvent,
  Evaluation,
  ScheduleBlock,
  Subject,
} from "@/lib/types";
import { normalizeLayout, studyLast7Days, type StudyDay } from "@/lib/widgets";
import { WeeklySchedule } from "./weekly-schedule";
import { NextClassCountdown } from "./live-clock";
import { DashboardGrid } from "./dashboard-grid";

const DriveBanner = dynamic(() =>
  import("./drive-banner").then((m) => m.DriveBanner)
);

function greeting(hour: number): string {
  if (hour < 6) return "Buenas noches";
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function firstName(fullName: string | null | undefined, email: string): string {
  const source = (fullName ?? email.split("@")[0] ?? "").trim();
  const first = source.split(/[\s._-]+/)[0] ?? "";
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : "";
}

export default async function DashboardPage() {
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

  if (!semester) redirect("/onboarding/schedule-import");

  const { data: subjects } = await supabase
    .from("subjects")
    .select()
    .eq("semester_id", semester.id)
    .order("name");

  const subjectIds = (subjects ?? []).map((s) => s.id);
  const [{ data: blocks }, { data: evaluations }] = subjectIds.length
    ? await Promise.all([
        supabase.from("schedule_blocks").select().in("subject_id", subjectIds),
        supabase.from("evaluations").select().in("subject_id", subjectIds),
      ])
    : [{ data: [] as ScheduleBlock[] }, { data: [] as Evaluation[] }];

  const since60 = new Date();
  since60.setDate(since60.getDate() - 60);
  const [
    { data: upcomingEvents },
    { data: recentSessions },
    { data: prefs },
  ] = await Promise.all([
    supabase
      .from("events")
      .select()
      .eq("semester_id", semester.id)
      .eq("completed", false)
      .order("due_at")
      .limit(20),
    supabase
      .from("study_sessions")
      .select("started_at, duration_minutes")
      .gte("started_at", since60.toISOString()),
    supabase
      .from("user_preferences")
      .select("dashboard_layout, focus_mode")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const streak = computeStreak(
    (recentSessions ?? []) as { started_at: string }[]
  );

  const nowForStudy = new Date();
  const studyMinutesByDay = new Map<string, number>();
  for (const s of recentSessions ?? []) {
    const key = new Date(s.started_at).toISOString().slice(0, 10);
    studyMinutesByDay.set(
      key,
      (studyMinutesByDay.get(key) ?? 0) + (s.duration_minutes ?? 0)
    );
  }
  const studyByDay: StudyDay[] = studyLast7Days(
    Array.from(studyMinutesByDay, ([date, minutes]) => ({ date, minutes })),
    nowForStudy
  );

  const layout = normalizeLayout(prefs?.dashboard_layout);
  const focusMode = Boolean(prefs?.focus_mode);

  const summaryBySubject = new Map(
    subjectIds.map((sid) => [
      sid,
      summarizeGrades(
        ((evaluations ?? []) as Evaluation[]).filter(
          (e) => e.subject_id === sid
        )
      ),
    ])
  );

  const now = new Date();
  const dayIdx = now.getDay();
  const todayBlocks = ((blocks ?? []) as ScheduleBlock[])
    .filter((b) => b.day_of_week === dayIdx)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const ongoing = todayBlocks.find(
    (b) =>
      b.start_time.slice(0, 5) <= nowTime && nowTime < b.end_time.slice(0, 5)
  );
  const nextUp = todayBlocks.find(
    (b) => b.start_time.slice(0, 5) > nowTime
  );
  const ongoingSubject = ongoing
    ? (subjects ?? []).find((s) => s.id === ongoing.subject_id)
    : null;
  const nextSubject = nextUp
    ? (subjects ?? []).find((s) => s.id === nextUp.subject_id)
    : null;

  const totalCredits = (subjects ?? []).reduce(
    (sum, s) => sum + (s.credits ?? 0),
    0
  );
  const weeklyHours = (blocks ?? []).reduce((sum, b) => {
    const [sh, sm] = b.start_time.split(":").map(Number);
    const [eh, em] = b.end_time.split(":").map(Number);
    return sum + (eh * 60 + em - sh * 60 - sm) / 60;
  }, 0);

  const pendingEvents = (upcomingEvents ?? []).length;
  const urgentCount = ((upcomingEvents ?? []) as CalendarEvent[]).filter(
    (e) => relativeDue(e.due_at).urgent
  ).length;

  let progressPct: number | null = null;
  let weeksLeft: number | null = null;
  if (semester.start_date && semester.end_date) {
    const start = new Date(semester.start_date).getTime();
    const end = new Date(semester.end_date).getTime();
    const nowMs = now.getTime();
    if (end > start) {
      progressPct = Math.max(
        0,
        Math.min(100, Math.round(((nowMs - start) / (end - start)) * 100))
      );
      weeksLeft = Math.max(
        0,
        Math.ceil((end - nowMs) / (1000 * 60 * 60 * 24 * 7))
      );
    }
  }

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const displayName = firstName(
    typeof meta?.full_name === "string"
      ? (meta.full_name as string)
      : typeof meta?.name === "string"
        ? (meta.name as string)
        : null,
    user.email ?? ""
  );
  const hi = greeting(now.getHours());
  const todayLabel = now.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-white/[0.03] to-violet-600/10 p-6 backdrop-blur-sm sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-violet-600/15 blur-2xl"
          />
          <div className="relative">
            <p className="text-xs font-medium uppercase tracking-widest text-indigo-300">
              {todayLabel}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {hi}
              {displayName ? `, ${displayName}` : ""}.
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-zinc-400">
              <span>
                Semestre{" "}
                <span className="font-medium text-zinc-200">
                  {semester.label ?? semester.name}
                </span>
                {ongoing && ongoingSubject
                  ? ` · clase en curso: ${ongoingSubject.name}`
                  : nextUp && nextSubject
                    ? ` · próxima clase: ${nextSubject.name} a las ${nextUp.start_time.slice(0, 5)}`
                    : todayBlocks.length === 0
                      ? " · sin clases hoy"
                      : " · terminaste tus clases de hoy"}
                .
              </span>
              {ongoing && (
                <NextClassCountdown
                  startTime={ongoing.start_time}
                  endTime={ongoing.end_time}
                  ongoing
                />
              )}
              {!ongoing && nextUp && (
                <NextClassCountdown
                  startTime={nextUp.start_time}
                  endTime={nextUp.end_time}
                  ongoing={false}
                />
              )}
            </div>

            {progressPct !== null && (
              <div className="mt-6 max-w-md">
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  <span>Progreso del semestre</span>
                  <span className="text-zinc-300">
                    {progressPct}%
                    {weeksLeft !== null && weeksLeft > 0
                      ? ` · faltan ${weeksLeft} sem`
                      : ""}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {!semester.drive_folder_id && <DriveBanner semesterId={semester.id} />}

        {ongoing && ongoingSubject && (
          <section className="mt-6">
            <Link
              href={`/materias/${ongoingSubject.id}`}
              className="group flex items-center gap-4 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-4 backdrop-blur-sm transition hover:border-indigo-400/50 hover:bg-indigo-500/15 sm:p-5"
            >
              <span
                className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white"
                style={{
                  backgroundColor: ongoingSubject.color ?? "#6366f1",
                }}
              >
                {ongoingSubject.name.charAt(0).toUpperCase()}
                <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300">
                  En curso ahora
                </p>
                <p className="mt-0.5 truncate text-base font-semibold text-white sm:text-lg">
                  {ongoingSubject.name}
                </p>
                <p className="text-xs text-zinc-400">
                  {ongoing.start_time.slice(0, 5)}–
                  {ongoing.end_time.slice(0, 5)}
                  {ongoing.room_code ? ` · ${ongoing.room_code}` : ""}
                  {ongoingSubject.professor ? ` · ${ongoingSubject.professor}` : ""}
                </p>
              </div>
              <span className="hidden text-xs font-medium text-indigo-300 transition group-hover:translate-x-0.5 sm:inline">
                Abrir →
              </span>
            </Link>
          </section>
        )}

        <DashboardGrid
          payload={{
            subjects: (subjects ?? []) as Subject[],
            events: (upcomingEvents ?? []) as CalendarEvent[],
            evaluations: (evaluations ?? []) as Evaluation[],
            blocks: (blocks ?? []) as ScheduleBlock[],
            studyByDay,
            streak,
            now: now.toISOString(),
          }}
          initialLayout={layout}
          initialFocusMode={focusMode}
        />

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            {
              label: "Materias",
              value: (subjects ?? []).length,
              icon: (
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path
                    d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              ),
              tint: "text-indigo-300 bg-indigo-500/10",
            },
            {
              label: "Créditos",
              value: totalCredits > 0 ? totalCredits : "—",
              icon: (
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path
                    d="m12 3 2.9 5.9 6.6.95-4.75 4.63 1.12 6.52L12 17.9l-5.87 3.1 1.12-6.52L2.5 9.85l6.6-.95L12 3Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              ),
              tint: "text-amber-300 bg-amber-500/10",
            },
            {
              label: "Horas/sem",
              value: weeklyHours > 0 ? `${weeklyHours}h` : "—",
              icon: (
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M12 7v5l3 2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              ),
              tint: "text-emerald-300 bg-emerald-500/10",
            },
            {
              label: "Entregas",
              value: pendingEvents,
              hint:
                urgentCount > 0
                  ? `${urgentCount} urgente${urgentCount === 1 ? "" : "s"}`
                  : undefined,
              icon: (
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path
                    d="M12 2v3m0 14v3m10-10h-3M5 12H2m17.07-7.07-2.12 2.12M7.05 16.95l-2.12 2.12m14.14 0-2.12-2.12M7.05 7.05 4.93 4.93"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              ),
              tint:
                urgentCount > 0
                  ? "text-red-300 bg-red-500/10"
                  : "text-sky-300 bg-sky-500/10",
            },
            {
              label: "Racha",
              value:
                streak.current > 0
                  ? `${streak.current} d${streak.current === 1 ? "ía" : "ías"}`
                  : "—",
              hint: streak.hasToday
                ? "hoy ✓"
                : streak.current > 0
                  ? "estudia hoy para no romperla"
                  : streak.longest > 0
                    ? `mejor: ${streak.longest} d${streak.longest === 1 ? "ía" : "ías"}`
                    : undefined,
              icon: (
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path
                    d="M13 3s3 3 3 7-3 5-3 5 4 1 4 4-3 3-5 3-5-1-5-4c0-4 6-6 6-15Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              ),
              tint:
                streak.current > 0
                  ? "text-orange-300 bg-orange-500/10"
                  : "text-zinc-400 bg-white/5",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/[0.05]"
            >
              <div
                className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${stat.tint}`}
              >
                {stat.icon}
              </div>
              <p className="text-2xl font-bold text-white tabular-nums">
                {stat.value}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">{stat.label}</p>
              {stat.hint && (
                <p className="mt-1 text-[11px] font-medium text-red-300">
                  {stat.hint}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { href: "/calendario", label: "Calendario" },
            { href: "/estudio", label: "Estudiar" },
            { href: "/asistente", label: "Preguntar" },
            { href: "/biblioteca", label: "Documentos" },
          ].map((qa) => (
            <Link
              key={qa.href}
              href={qa.href}
              className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-center text-sm font-medium text-zinc-300 transition hover:border-white/25 hover:bg-white/[0.06] hover:text-white"
            >
              {qa.label}
            </Link>
          ))}
        </div>

        {todayBlocks.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Clases de hoy
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {todayBlocks.map((b) => {
                const subject = (subjects ?? []).find(
                  (s) => s.id === b.subject_id
                );
                const ended = b.end_time.slice(0, 5) <= nowTime;
                const isOngoing =
                  b.start_time.slice(0, 5) <= nowTime &&
                  nowTime < b.end_time.slice(0, 5);
                return (
                  <Link
                    key={b.id}
                    href={subject ? `/materias/${subject.id}` : "/dashboard"}
                    className={`min-w-52 shrink-0 rounded-2xl border p-4 backdrop-blur-sm transition hover:border-white/25 ${
                      isOngoing
                        ? "border-indigo-400/40 bg-indigo-500/10"
                        : "border-white/10 bg-white/[0.03]"
                    } ${ended ? "opacity-50" : ""}`}
                  >
                    <p className="flex items-center gap-2 text-sm font-semibold text-white">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: subject?.color ?? "#6366f1" }}
                      />
                      <span className="truncate">
                        {subject?.name ?? "Clase"}
                      </span>
                    </p>
                    <p className="mt-1.5 text-xs text-zinc-400">
                      {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                      {b.room_code ? ` · ${b.room_code}` : ""}
                    </p>
                    {isOngoing && (
                      <p className="mt-2 text-[11px] font-medium text-indigo-300">
                        En curso ahora
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Horario semanal
          </h2>
          <WeeklySchedule
            subjects={(subjects ?? []) as Subject[]}
            blocks={(blocks ?? []) as ScheduleBlock[]}
          />
        </section>

        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Materias
            </h2>
            <Link
              href="/analitica"
              className="text-xs font-medium text-indigo-400 transition hover:text-indigo-300"
            >
              Ver analítica →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(subjects ?? []).map((s) => {
              const summary = summaryBySubject.get(s.id);
              const hasGrades = (summary?.evaluatedPercent ?? 0) > 0;
              return (
                <Link
                  key={s.id}
                  href={`/materias/${s.id}`}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.05]"
                >
                  <span
                    className="absolute inset-x-0 top-0 h-1"
                    style={{ backgroundColor: s.color ?? "#6366f1" }}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold leading-snug text-white">
                      {s.name}
                    </h3>
                    {hasGrades && summary && (
                      <span
                        className={`shrink-0 rounded-lg px-2 py-1 text-sm font-bold tabular-nums ${
                          summary.status === "perdida"
                            ? "bg-red-500/10 text-red-400"
                            : summary.status === "aprobada"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-white/10 text-white"
                        }`}
                        title={`Nota acumulada · ${summary.evaluatedPercent}% evaluado`}
                      >
                        {formatGrade(summary.accumulated)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-zinc-500">
                    {s.code}
                    {s.group_name ? ` · Grupo ${s.group_name}` : ""}
                    {s.credits ? ` · ${s.credits} créditos` : ""}
                  </p>
                  {s.professor && (
                    <p className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-zinc-300">
                        {s.professor.charAt(0).toUpperCase()}
                      </span>
                      {s.professor}
                    </p>
                  )}
                  {hasGrades && summary && (
                    <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${summary.evaluatedPercent}%`,
                          backgroundColor: s.color ?? "#6366f1",
                        }}
                      />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      </main>
  );
}
