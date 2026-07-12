import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Bookmark, Subject } from "@/lib/types";
import { BookmarksClient } from "./bookmarks-client";

export default async function EnlacesPage() {
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

  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select()
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <header>
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-indigo-400">
            {semester.label ?? semester.name}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Banco de enlaces
          </h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            Artículos, papers, videos, repos y normativa que quieres tener a
            mano. Pega una URL y Acadia extrae título, descripción y favicon.
          </p>
        </header>

        <BookmarksClient
          userId={user.id}
          subjects={(subjects ?? []) as Subject[]}
          initialBookmarks={(bookmarks ?? []) as Bookmark[]}
        />
      </main>
  );
}
