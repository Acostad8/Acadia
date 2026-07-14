import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PortfolioPdf } from "@/lib/portfolio/pdf-document";
import type { PortfolioDataset, PortfolioTemplate } from "@/lib/portfolio/data";
import type { Project, PublicProfile, Semester, Subject } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "portfolio-exports";
const CACHE_MS = 24 * 60 * 60 * 1000;
const SIGNED_URL_TTL_S = 60 * 60 * 24;

const TEMPLATES: PortfolioTemplate[] = ["minimal", "academic", "showcase"];

function isTemplate(value: string | null): value is PortfolioTemplate {
  return !!value && (TEMPLATES as string[]).includes(value);
}

function baseUrlFrom(request: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (envUrl) return envUrl;
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  const proto = forwardedProto ?? "https";
  return host ? `${proto}://${host}` : "https://acadia.local";
}

async function buildDataset(
  userId: string,
  email: string | null,
  baseUrl: string
): Promise<PortfolioDataset> {
  const supabase = await createClient();
  const [
    { data: profile },
    { data: subjects },
    { data: semesters },
    { data: projects },
  ] = await Promise.all([
    supabase
      .from("public_profiles")
      .select()
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("subjects").select().eq("user_id", userId),
    supabase.from("semesters").select().eq("user_id", userId),
    supabase
      .from("projects")
      .select()
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const subjectsById: Record<string, Subject> = {};
  for (const subject of (subjects ?? []) as Subject[]) {
    subjectsById[subject.id] = subject;
  }
  const semestersById: Record<string, Semester> = {};
  for (const semester of (semesters ?? []) as Semester[]) {
    semestersById[semester.id] = semester;
  }
  const semesterOrder = [...((semesters ?? []) as Semester[])]
    .sort((a, b) => {
      const ta = a.start_date ?? a.created_at;
      const tb = b.start_date ?? b.created_at;
      return tb.localeCompare(ta);
    })
    .map((s) => s.id);

  const typedProfile = (profile ?? null) as PublicProfile | null;
  const displayName = typedProfile?.display_name?.trim() || email?.split("@")[0] || "Estudiante";
  const publicUrl =
    typedProfile?.is_public && typedProfile.slug
      ? `${baseUrl}/p/${typedProfile.slug}`
      : null;

  return {
    profile: typedProfile,
    displayName,
    headline: typedProfile?.headline?.trim() || null,
    bio: typedProfile?.bio?.trim() || null,
    website: typedProfile?.website_url?.trim() || null,
    email,
    publicUrl,
    projects: ((projects ?? []) as Project[]),
    subjectsById,
    semestersById,
    semesterOrder,
  };
}

function storagePath(userId: string, template: PortfolioTemplate, onePage: boolean) {
  const suffix = onePage ? "onepage" : "full";
  return `${userId}/${template}-${suffix}.pdf`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    template?: string;
    onePage?: boolean;
    force?: boolean;
  };
  const template = isTemplate(body.template ?? "minimal") ? (body.template as PortfolioTemplate) : "minimal";
  const onePage = Boolean(body.onePage);
  const force = Boolean(body.force);

  const service = createServiceClient();

  if (!force) {
    const { data: cached } = await service
      .from("portfolio_exports")
      .select("storage_path, expires_at")
      .eq("user_id", user.id)
      .eq("template", template)
      .eq("one_page", onePage)
      .maybeSingle();
    if (cached && new Date(cached.expires_at).getTime() > new Date().getTime()) {
      const { data: signed, error: signErr } = await service.storage
        .from(BUCKET)
        .createSignedUrl(cached.storage_path, SIGNED_URL_TTL_S);
      if (!signErr && signed?.signedUrl) {
        return NextResponse.json({
          url: signed.signedUrl,
          cached: true,
          expiresAt: cached.expires_at,
        });
      }
    }
  }

  const baseUrl = baseUrlFrom(request);
  const dataset = await buildDataset(user.id, user.email ?? null, baseUrl);
  const qrTarget = dataset.publicUrl ?? `${baseUrl}/portafolio`;
  const qrDataUrl = await QRCode.toDataURL(qrTarget, {
    margin: 1,
    scale: 4,
    color: { dark: "#111827", light: "#ffffff" },
  });

  const generatedAt = new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

  const buffer = await renderToBuffer(
    <PortfolioPdf
      data={dataset}
      template={template}
      onePage={onePage}
      qrDataUrl={qrDataUrl}
      generatedAt={generatedAt}
    />
  );

  const path = storagePath(user.id, template, onePage);
  const uploadBody = new Uint8Array(buffer);
  const { error: uploadErr } = await service.storage
    .from(BUCKET)
    .upload(path, uploadBody, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadErr) {
    return NextResponse.json(
      { error: "No se pudo guardar el PDF." },
      { status: 500 }
    );
  }

  const expiresAt = new Date(new Date().getTime() + CACHE_MS).toISOString();
  await service.from("portfolio_exports").upsert(
    {
      user_id: user.id,
      template,
      one_page: onePage,
      storage_path: path,
      expires_at: expiresAt,
    },
    { onConflict: "user_id,template,one_page" }
  );

  const { data: signed, error: signErr } = await service.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_S);
  if (signErr || !signed?.signedUrl) {
    return NextResponse.json(
      { error: "No se pudo generar el enlace de descarga." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    url: signed.signedUrl,
    cached: false,
    expiresAt,
  });
}
