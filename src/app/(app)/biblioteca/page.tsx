import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Document, Subject } from "@/lib/types";
import { LibraryClient } from "./library-client";

export default async function BibliotecaPage() {
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

  const { data: documents } = await supabase
    .from("documents")
    .select()
    .eq("semester_id", semester.id)
    .order("uploaded_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-widest text-indigo-400">
              {semester.label ?? semester.name}
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Biblioteca
            </h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-400">
              Documentos organizados por materia y tipo, sincronizados con
              Google Drive.
            </p>
          </div>
        </header>

        <LibraryClient
          subjects={(subjects ?? []) as Subject[]}
          initialDocuments={(documents ?? []) as Document[]}
          driveReady={Boolean(semester.drive_folder_id)}
        />
      </main>
  );
}
