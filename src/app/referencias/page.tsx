import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BibReference, ReferenceGroup, Subject } from "@/lib/types";
import { AppNav } from "@/components/app-nav";
import { ReferencesClient } from "./references-client";

export default async function ReferenciasPage() {
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

  const [{ data: subjects }, { data: references }, { data: groups }] =
    await Promise.all([
      supabase
        .from("subjects")
        .select()
        .eq("semester_id", semester.id)
        .order("name"),
      supabase
        .from("bib_references")
        .select()
        .order("created_at", { ascending: false }),
      supabase.from("reference_groups").select().order("name"),
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
            Referencias
          </h1>
        </header>

        <ReferencesClient
          userId={user.id}
          subjects={(subjects ?? []) as Subject[]}
          initialReferences={(references ?? []) as BibReference[]}
          initialGroups={(groups ?? []) as ReferenceGroup[]}
        />
      </main>
    </>
  );
}
