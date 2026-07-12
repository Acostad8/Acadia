import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CalendarEvent, Subject } from "@/lib/types";
import { CalendarClient } from "./calendar-client";

export default async function CalendarioPage() {
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

  const [{ data: subjects }, { data: events }] = await Promise.all([
    supabase
      .from("subjects")
      .select()
      .eq("semester_id", semester.id)
      .order("name"),
    supabase
      .from("events")
      .select()
      .eq("semester_id", semester.id)
      .order("due_at"),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <header>
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-indigo-400">
            {semester.label ?? semester.name}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Calendario
          </h1>
        </header>

        <CalendarClient
          semesterId={semester.id}
          userId={user.id}
          subjects={(subjects ?? []) as Subject[]}
          initialEvents={(events ?? []) as CalendarEvent[]}
        />
      </main>
  );
}
