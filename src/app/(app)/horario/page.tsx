import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ScheduleBlock, Subject } from "@/lib/types";
import { HorarioClient } from "./horario-client";

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

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white">Horario</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {semester.label ?? semester.name}
        </p>
      </header>
      <HorarioClient
        subjects={(subjects ?? []) as Subject[]}
        blocks={(blocks ?? []) as ScheduleBlock[]}
      />
    </main>
  );
}
