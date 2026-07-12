import Link from "next/link";
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
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-indigo-400">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-bold text-white">
              A
            </span>
            {semester.label ?? semester.name}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Calendario
          </h1>
        </div>
        <Link
          href="/dashboard"
          className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
        >
          ← Dashboard
        </Link>
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
