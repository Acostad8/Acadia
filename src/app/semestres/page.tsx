import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Semester } from "@/lib/types";
import { SemestersClient } from "./semesters-client";

export default async function SemestresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: semesters } = await supabase
    .from("semesters")
    .select()
    .order("created_at", { ascending: false });

  const { data: subjectCounts } = await supabase
    .from("subjects")
    .select("semester_id");

  const countBySemester = new Map<string, number>();
  for (const row of subjectCounts ?? []) {
    countBySemester.set(
      row.semester_id,
      (countBySemester.get(row.semester_id) ?? 0) + 1
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-indigo-400">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-bold text-white">
              A
            </span>
            Acadia
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Semestres
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/onboarding"
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110"
          >
            + Nuevo semestre
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <SemestersClient
        initialSemesters={(semesters ?? []) as Semester[]}
        subjectCounts={Object.fromEntries(countBySemester)}
      />
    </main>
  );
}
