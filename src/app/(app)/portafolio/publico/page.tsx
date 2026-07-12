import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PublicProfile } from "@/lib/types";
import { PublicProfileEditor } from "./editor";

export default async function PublicProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("public_profiles")
    .select()
    .eq("user_id", user.id)
    .maybeSingle();

  const { count: publicProjects } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_public", true);

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const defaultName =
    (typeof meta?.full_name === "string" && meta.full_name) ||
    (typeof meta?.name === "string" && meta.name) ||
    (user.email ?? "").split("@")[0] ||
    "Estudiante";
  const defaultAvatar =
    typeof meta?.avatar_url === "string" ? (meta.avatar_url as string) : null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
        <header>
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-indigo-400">
            Portafolio
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Perfil público
          </h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            Configura tu página pública para compartir tus proyectos con
            reclutadores o profesores. Se muestra en{" "}
            <span className="font-mono text-indigo-300">/p/tu-slug</span>.
          </p>
        </header>

        <PublicProfileEditor
          userId={user.id}
          initialProfile={(profile ?? null) as PublicProfile | null}
          defaultName={defaultName as string}
          defaultAvatar={defaultAvatar}
          publicProjectsCount={publicProjects ?? 0}
        />
      </main>
  );
}
