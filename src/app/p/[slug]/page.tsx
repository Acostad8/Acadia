import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Project, PublicProfile } from "@/lib/types";
import { LogoMark } from "@/components/logo";

const STATUS_LABEL: Record<string, string> = {
  idea: "Idea",
  en_desarrollo: "En desarrollo",
  terminado: "Terminado",
};

const STATUS_STYLE: Record<string, string> = {
  idea: "bg-white/10 text-zinc-300",
  en_desarrollo: "bg-amber-500/15 text-amber-300",
  terminado: "bg-emerald-500/15 text-emerald-300",
};

async function loadProfile(slug: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("public_profiles")
    .select()
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  if (!profile) return null;
  const { data: projects } = await supabase
    .from("projects")
    .select()
    .eq("user_id", profile.user_id)
    .eq("is_public", true)
    .order("created_at", { ascending: false });
  return {
    profile: profile as PublicProfile,
    projects: (projects ?? []) as Project[],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadProfile(slug);
  if (!data) return { title: "Perfil no encontrado · Acadia" };
  const { profile } = data;
  return {
    title: `${profile.display_name} · Acadia`,
    description:
      profile.headline ?? profile.bio ?? `Portafolio académico de ${profile.display_name}`,
    openGraph: {
      title: profile.display_name,
      description: profile.headline ?? profile.bio ?? undefined,
      type: "profile",
    },
  };
}

export default async function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await loadProfile(slug);
  if (!data) notFound();
  const { profile, projects } = data;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-10">
      <nav className="mb-10 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-white transition hover:opacity-80"
        >
          <LogoMark size={28} />
          <span className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Acadia
          </span>
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:border-white/25 hover:text-white"
        >
          Crear el mío
        </Link>
      </nav>

      <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-white/[0.03] to-violet-600/10 p-8 backdrop-blur-sm">
        <div className="flex flex-wrap items-start gap-6">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="h-24 w-24 shrink-0 rounded-2xl border border-white/10 object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-3xl font-bold text-white">
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {profile.display_name}
            </h1>
            {profile.headline && (
              <p className="mt-1 text-base text-indigo-300">{profile.headline}</p>
            )}
            {profile.bio && (
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-zinc-400">
                {profile.bio}
              </p>
            )}
            {profile.website_url && (
              <a
                href={profile.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                  <path
                    d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
                {profile.website_url.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>
      </header>

      <section className="mt-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Proyectos publicados
          </h2>
          <span className="text-xs text-zinc-500">
            {projects.length} proyecto{projects.length === 1 ? "" : "s"}
          </span>
        </div>
        {projects.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-12 text-center text-sm text-zinc-500">
            Este portafolio aún no tiene proyectos publicados.
          </p>
        ) : (
          <ul className="space-y-4">
            {projects.map((p) => (
              <li
                key={p.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm transition hover:border-white/20"
              >
                {p.cover_url && (
                  <div className="relative h-40 w-full overflow-hidden bg-zinc-900">
                    <img
                      src={p.cover_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 to-transparent" />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-white">
                      {p.name}
                    </h3>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[p.status] ?? "bg-white/10 text-zinc-300"}`}
                    >
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </div>
                  {p.description && (
                    <p className="mt-2 text-sm text-zinc-400">{p.description}</p>
                  )}
                  {p.highlights && (
                    <p className="mt-3 whitespace-pre-line text-sm text-zinc-300">
                      {p.highlights}
                    </p>
                  )}
                  {p.technologies.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {p.technologies.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {p.repo_url && (
                      <a
                        href={p.repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
                      >
                        Repositorio →
                      </a>
                    )}
                    {p.demo_url && (
                      <a
                        href={p.demo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110"
                      >
                        Ver demo →
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-16 text-center text-xs text-zinc-600">
        Portafolio hecho con{" "}
        <Link href="/" className="text-indigo-400 hover:text-indigo-300">
          Acadia
        </Link>
      </footer>
    </main>
  );
}
