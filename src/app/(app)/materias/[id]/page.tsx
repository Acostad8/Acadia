import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Evaluation, ScheduleBlock, Subject } from "@/lib/types";
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

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-indigo-400">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color ?? "#6366f1" }}
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
