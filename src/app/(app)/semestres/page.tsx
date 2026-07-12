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
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-widest text-indigo-400">
              Acadia
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Semestres
            </h1>
          </div>
          <Link
            href="/onboarding"
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110"
          >
            + Nuevo semestre
          </Link>
        </header>

        <SemestersClient
          initialSemesters={(semesters ?? []) as Semester[]}
          subjectCounts={Object.fromEntries(countBySemester)}
        />
      </main>
  );
}
