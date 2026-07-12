import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Project, Semester, Subject } from "@/lib/types";
import { PortfolioClient } from "./portfolio-client";

export default async function PortafolioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: semesters }, { data: subjects }, { data: projects }] =
    await Promise.all([
      supabase.from("semesters").select().order("created_at"),
      supabase.from("subjects").select().order("name"),
      supabase
        .from("projects")
        .select()
        .order("created_at", { ascending: false }),
    ]);

  if (!semesters || semesters.length === 0) redirect("/onboarding");

  const current = (semesters as Semester[]).find((s) => s.is_current);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <header>
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-indigo-400">
            Toda la carrera
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Portafolio
          </h1>
        </header>

        <PortfolioClient
          userId={user.id}
          currentSemesterId={current?.id ?? null}
          subjects={(subjects ?? []) as Subject[]}
          initialProjects={(projects ?? []) as Project[]}
        />
      </main>
  );
}
