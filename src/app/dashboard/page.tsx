import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ScheduleBlock, Subject } from "@/lib/types";
import { SignOutButton } from "./sign-out-button";
import { WeeklySchedule } from "./weekly-schedule";

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

  if (!semester) redirect("/onboarding");

  const { data: subjects } = await supabase
    .from("subjects")
    .select()
    .eq("semester_id", semester.id)
    .order("name");

  const subjectIds = (subjects ?? []).map((s) => s.id);
  const { data: blocks } = subjectIds.length
    ? await supabase
        .from("schedule_blocks")
        .select()
        .in("subject_id", subjectIds)
    : { data: [] as ScheduleBlock[] };

  const totalCredits = (subjects ?? []).reduce(
    (sum, s) => sum + (s.credits ?? 0),
    0
  );
  const weeklyHours = (blocks ?? []).reduce((sum, b) => {
    const [sh, sm] = b.start_time.split(":").map(Number);
    const [eh, em] = b.end_time.split(":").map(Number);
    return sum + (eh * 60 + em - sh * 60 - sm) / 60;
  }, 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-indigo-400">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-bold text-white">
              A
            </span>
            Semestre actual
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {semester.label ?? semester.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/onboarding"
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
          >
            + Nuevo semestre
          </Link>
          <SignOutButton />
        </div>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Materias", value: (subjects ?? []).length },
          {
            label: "Créditos",
            value: totalCredits > 0 ? totalCredits : "—",
          },
          {
            label: "Horas de clase / semana",
            value: weeklyHours > 0 ? `${weeklyHours}h` : "—",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm"
          >
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="mt-1 text-xs text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Horario semanal
        </h2>
        <WeeklySchedule
          subjects={(subjects ?? []) as Subject[]}
          blocks={(blocks ?? []) as ScheduleBlock[]}
        />
      </section>

      <section className="mt-10 pb-10">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Materias
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(subjects ?? []).map((s) => (
            <div
              key={s.id}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm transition hover:border-white/20"
            >
              <span
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: s.color ?? "#6366f1" }}
              />
              <h3 className="font-semibold leading-snug text-white">
                {s.name}
              </h3>
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
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
