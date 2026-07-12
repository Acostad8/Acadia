import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { StudySession, Subject } from "@/lib/types";
import { AppNav } from "@/components/app-nav";
import { StudyClient } from "./study-client";

export default async function EstudioPage() {
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

  const since = new Date();
  since.setDate(since.getDate() - 28);

  const [{ data: subjects }, { data: sessions }] = await Promise.all([
    supabase
      .from("subjects")
      .select()
      .eq("semester_id", semester.id)
      .order("name"),
    supabase
      .from("study_sessions")
      .select()
      .gte("started_at", since.toISOString())
      .order("started_at", { ascending: false }),
  ]);

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <header>
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-indigo-400">
            {semester.label ?? semester.name}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Estudio
          </h1>
        </header>

        <StudyClient
          userId={user.id}
          subjects={(subjects ?? []) as Subject[]}
          initialSessions={(sessions ?? []) as StudySession[]}
        />
      </main>
    </>
  );
}
