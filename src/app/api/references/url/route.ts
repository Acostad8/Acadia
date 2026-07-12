import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_HTML_BYTES = 1_500_000;

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) {
    return true;
  }
  // IPv4 literales privados / loopback / link-local / metadata
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    const [a, b] = h.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    return false;
  }
  // IPv6 loopback / unique-local / link-local
  if (h.includes(":")) {
    return (
      h === "::1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80")
    );
  }
  return false;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .trim();
}

function metaContent(html: string, names: string[]): string[] {
  const results: string[] = [];
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*(?:name|property)=["']${name}["']`,
      "gi"
    );
    let m;
    while ((m = re.exec(html)) !== null) {
      const value = decodeEntities(m[1] ?? m[2] ?? "");
      if (value) results.push(value);
    }
    if (results.length) return results;
  }
  return results;
}

/** "Nombre Segundo Apellido" → "Apellido, N. S." — si ya viene "Apellido, N." se respeta. */
function toApaAuthor(raw: string): string {
  const name = raw.trim();
  if (!name) return "";
  if (name.includes(",")) return name;
  const parts = name.split(/\s+/);
  if (parts.length === 1) return name;
  const last = parts[parts.length - 1];
  const initials = parts
    .slice(0, -1)
    .map((p) => `${p.charAt(0).toUpperCase()}.`)
    .join(" ");
  return `${last}, ${initials}`;
}

type LdNode = {
  "@type"?: string | string[];
  headline?: string;
  name?: string;
  datePublished?: string;
  author?: unknown;
  publisher?: { name?: string } | string;
  isPartOf?: { name?: string };
  "@graph"?: LdNode[];
};

function ldAuthors(author: unknown): string[] {
  const list = Array.isArray(author) ? author : author ? [author] : [];
  return list
    .map((a) => {
      if (typeof a === "string") return a;
      if (a && typeof a === "object" && "name" in a) {
        const n = (a as { name?: unknown }).name;
        return typeof n === "string" ? n : "";
      }
      return "";
    })
    .filter(Boolean);
}

function parseJsonLd(html: string): {
  title?: string;
  authors?: string[];
  date?: string;
  source?: string;
} | null {
  const re =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1]) as LdNode | LdNode[];
      const nodes: LdNode[] = Array.isArray(parsed)
        ? parsed
        : parsed["@graph"]
          ? parsed["@graph"]
          : [parsed];
      for (const node of nodes) {
        const types = Array.isArray(node["@type"])
          ? node["@type"]
          : [node["@type"] ?? ""];
        if (
          types.some((t) =>
            ["Article", "NewsArticle", "BlogPosting", "ScholarlyArticle", "WebPage", "Report"].includes(
              t ?? ""
            )
          )
        ) {
          const publisher =
            typeof node.publisher === "string"
              ? node.publisher
              : node.publisher?.name;
          return {
            title: node.headline ?? node.name,
            authors: ldAuthors(node.author),
            date: node.datePublished,
            source: publisher ?? node.isPartOf?.name,
          };
        }
      }
    } catch {
      // JSON-LD malformado: probar el siguiente bloque
    }
  }
  return null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const rawUrl = typeof body.url === "string" ? body.url.trim() : "";
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return NextResponse.json({ error: "Solo se admiten URLs http(s)" }, { status: 400 });
  }
  if (isPrivateHost(url.hostname)) {
    return NextResponse.json({ error: "URL no permitida" }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(url.toString(), {
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AcadiaBot/1.0; +referencias)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `El sitio respondió ${res.status}` },
        { status: 422 }
      );
    }
    const buffer = await res.arrayBuffer();
    html = new TextDecoder("utf-8").decode(buffer.slice(0, MAX_HTML_BYTES));
  } catch {
    return NextResponse.json(
      { error: "No se pudo acceder al sitio" },
      { status: 422 }
    );
  }

  const ld = parseJsonLd(html);

  // Prioridad: citation_* (académico) → JSON-LD → OpenGraph → <title>
  const citationTitle = metaContent(html, ["citation_title"])[0];
  const citationAuthors = metaContent(html, ["citation_author"]);
  const citationDate = metaContent(html, [
    "citation_publication_date",
    "citation_date",
    "citation_online_date",
  ])[0];
  const citationJournal = metaContent(html, [
    "citation_journal_title",
    "citation_conference_title",
    "citation_publisher",
  ])[0];
  const citationDoi = metaContent(html, ["citation_doi"])[0];

  const ogTitle = metaContent(html, ["og:title", "twitter:title"])[0];
  const ogSite = metaContent(html, ["og:site_name"])[0];
  const ogDate = metaContent(html, [
    "article:published_time",
    "date",
    "dc.date",
    "DC.date.issued",
  ])[0];
  const metaAuthors = metaContent(html, ["author", "article:author", "dc.creator"]);

  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];

  const title =
    citationTitle ?? ld?.title ?? ogTitle ?? (titleTag ? decodeEntities(titleTag) : "");
  const authorsRaw = citationAuthors.length
    ? citationAuthors
    : ld?.authors?.length
      ? ld.authors
      : metaAuthors;
  const dateRaw = citationDate ?? ld?.date ?? ogDate ?? "";
  const yearMatch = /(\d{4})/.exec(dateRaw);
  const source = citationJournal ?? ld?.source ?? ogSite ?? url.hostname.replace(/^www\./, "");

  return NextResponse.json({
    title,
    authors: authorsRaw.map(toApaAuthor).filter(Boolean).join("; "),
    year: yearMatch ? Number(yearMatch[1]) : null,
    source,
    url: url.toString(),
    doi: citationDoi ?? "",
    kind: citationTitle || citationDoi ? "articulo" : "web",
  });
}
