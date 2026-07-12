"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PublicProfile } from "@/lib/types";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{2,39}$/;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const inputClasses =
  "rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-indigo-400/60";

export function PublicProfileEditor({
  userId,
  initialProfile,
  defaultName,
  defaultAvatar,
  publicProjectsCount,
}: {
  userId: string;
  initialProfile: PublicProfile | null;
  defaultName: string;
  defaultAvatar: string | null;
  publicProjectsCount: number;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<PublicProfile | null>(initialProfile);
  const [slug, setSlug] = useState(
    initialProfile?.slug ?? slugify(defaultName)
  );
  const [displayName, setDisplayName] = useState(
    initialProfile?.display_name ?? defaultName
  );
  const [headline, setHeadline] = useState(initialProfile?.headline ?? "");
  const [bio, setBio] = useState(initialProfile?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(
    initialProfile?.avatar_url ?? defaultAvatar ?? ""
  );
  const [websiteUrl, setWebsiteUrl] = useState(
    initialProfile?.website_url ?? ""
  );
  const [isPublic, setIsPublic] = useState(initialProfile?.is_public ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const slugValid = SLUG_RE.test(slug);

  async function save() {
    setError(null);
    setMessage(null);
    if (!displayName.trim()) {
      setError("El nombre para mostrar es obligatorio.");
      return;
    }
    if (!slugValid) {
      setError(
        "El slug debe tener 3–40 caracteres: minúsculas, números o guiones."
      );
      return;
    }
    setBusy(true);
    const payload = {
      user_id: userId,
      slug,
      display_name: displayName.trim(),
      headline: headline.trim() || null,
      bio: bio.trim() || null,
      avatar_url: avatarUrl.trim() || null,
      website_url: websiteUrl.trim() || null,
      is_public: isPublic,
    };
    const { data, error: err } = await supabase
      .from("public_profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();
    setBusy(false);
    if (err) {
      if (err.code === "23505") {
        setError("Ese slug ya está en uso. Prueba con otro.");
      } else {
        setError(err.message || "No se pudo guardar el perfil.");
      }
      return;
    }
    setProfile(data as PublicProfile);
    setMessage("Perfil guardado.");
  }

  const publicUrl =
    typeof window !== "undefined" && profile?.is_public
      ? `${window.location.origin}/p/${profile.slug}`
      : profile?.is_public
        ? `/p/${profile.slug}`
        : null;

  return (
    <div className="mt-8 space-y-6">
      {profile?.is_public && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-emerald-300">
              Portafolio publicado
            </p>
            <p className="mt-0.5 text-xs text-emerald-200/70">
              {publicProjectsCount} proyecto
              {publicProjectsCount === 1 ? "" : "s"} visible
              {publicProjectsCount === 1 ? "" : "s"} en tu página pública.
            </p>
          </div>
          {publicUrl && (
            <Link
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/30"
            >
              Ver mi página →
            </Link>
          )}
        </div>
      )}

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm">
        <div className="grid grid-cols-1 gap-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-400">
              Slug (URL de tu página)
            </span>
            <div className="flex items-stretch gap-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-900 focus-within:border-indigo-400/60">
              <span className="flex items-center bg-white/5 px-3 font-mono text-xs text-zinc-500">
                /p/
              </span>
              <input
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="tu-nombre"
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600"
              />
            </div>
            {!slugValid && slug.length > 0 && (
              <p className="mt-1 text-[11px] text-amber-400">
                Debe tener 3–40 caracteres: minúsculas, números o guiones.
              </p>
            )}
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-400">
              Nombre para mostrar
            </span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Tu nombre"
              className={`${inputClasses} w-full`}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-400">
              Titular (headline)
            </span>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="ej. Estudiante de Ingeniería de Sistemas · UFPSO"
              className={`${inputClasses} w-full`}
              maxLength={120}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-400">
              Bio (breve presentación)
            </span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Cuenta en qué te especializas, qué tecnologías dominas, qué buscas..."
              rows={5}
              className={`${inputClasses} w-full resize-none`}
              maxLength={800}
            />
            <span className="mt-1 block text-right text-[11px] text-zinc-600">
              {bio.length}/800
            </span>
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-400">
                Avatar (URL)
              </span>
              <input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className={`${inputClasses} w-full`}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-400">
                Sitio / LinkedIn (opcional)
              </span>
              <input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className={`${inputClasses} w-full`}
              />
            </label>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer accent-indigo-500"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">
                  Publicar mi página
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  Al activar esto, tu perfil y los proyectos marcados como
                  públicos serán accesibles en{" "}
                  <span className="font-mono text-indigo-300">
                    /p/{slug || "tu-slug"}
                  </span>{" "}
                  sin autenticación.
                </p>
              </div>
            </label>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300">
            {message}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Link
            href="/portafolio"
            className="rounded-xl px-4 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
          >
            Volver
          </Link>
          <button
            onClick={save}
            disabled={busy}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Guardando..." : "Guardar perfil"}
          </button>
        </div>
      </div>
    </div>
  );
}
