import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decodeEntities } from "@/lib/reference-extract";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_HTML_BYTES = 800_000;

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) {
    return true;
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    const [a, b] = h.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    return false;
  }
  if (h.includes(":")) {
    return (
      h === "::1" ||
      h.startsWith("fc") ||
      h.startsWith("fd") ||
      h.startsWith("fe80")
    );
  }
  return false;
}

function metaContent(html: string, key: string): string | null {
  const re = new RegExp(
    `<meta\\s+[^>]*?(?:name|property)=["']${key}["'][^>]*?content=["']([^"']*)["']|<meta\\s+[^>]*?content=["']([^"']*)["'][^>]*?(?:name|property)=["']${key}["']`,
    "i"
  );
  const m = re.exec(html);
  if (!m) return null;
  const raw = m[1] ?? m[2];
  return raw ? decodeEntities(raw).trim() : null;
}

function guessKind(url: URL, title: string): string {
  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();
  const t = title.toLowerCase();
  if (
    host.includes("youtube.") ||
    host.includes("youtu.be") ||
    host.includes("vimeo.")
  )
    return "video";
  if (host.includes("github.") || host.includes("gitlab.") || host.includes("bitbucket."))
    return "repositorio";
  if (
    host.includes("arxiv.") ||
    host.includes("scholar.google") ||
    host.includes("researchgate.") ||
    /\.pdf(\?|$)/.test(path) ||
    t.includes("paper") ||
    t.includes("proceedings")
  )
    return "paper";
  if (
    host.includes("gov.") ||
    host.includes(".gov") ||
    host.includes("iso.org") ||
    host.includes("ieee.org") ||
    t.includes("norma") ||
    t.includes("ley ")
  )
    return "normativa";
  if (
    host.includes("medium.") ||
    host.includes("dev.to") ||
    host.includes("substack.") ||
    host.includes("wordpress.") ||
    host.includes("blog")
  )
    return "blog";
  return "articulo";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const rawUrl = typeof body.url === "string" ? body.url.trim() : "";
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return NextResponse.json(
      { error: "Solo se admiten URLs http(s)" },
      { status: 400 }
    );
  }
  if (isPrivateHost(url.hostname)) {
    return NextResponse.json({ error: "URL no permitida" }, { status: 400 });
  }

  let html = "";
  try {
    const res = await fetch(url.toString(), {
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AcadiaBookmark/1.0)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
      },
    });
    if (res.ok) {
      const buf = await res.arrayBuffer();
      html = new TextDecoder("utf-8").decode(buf.slice(0, MAX_HTML_BYTES));
    }
  } catch {
    // Fallback devuelve título vacío
  }

  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  const title =
    metaContent(html, "og:title") ||
    metaContent(html, "twitter:title") ||
    (titleTag ? decodeEntities(titleTag).trim() : "") ||
    url.hostname;

  const description =
    metaContent(html, "og:description") ||
    metaContent(html, "twitter:description") ||
    metaContent(html, "description") ||
    "";

  const favicon = `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(url.hostname)}`;

  return NextResponse.json({
    url: url.toString(),
    title: title.slice(0, 300),
    description: description.slice(0, 500) || null,
    kind: guessKind(url, title),
    favicon_url: favicon,
  });
}
