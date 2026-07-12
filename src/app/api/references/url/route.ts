import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  decodeEntities,
  extractHeuristic,
  type Extraction,
} from "@/lib/reference-extract";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_HTML_BYTES = 2_000_000;

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

/** Etiquetas <meta> relevantes como texto "name: content" (evidencia para IA). */
function metaTagsAsText(html: string): string {
  const lines: string[] = [];
  const re =
    /<meta\s+[^>]*?(?:name|property)=["']([^"']+)["'][^>]*?content=["']([^"']*)["'][^>]*?>|<meta\s+[^>]*?content=["']([^"']*)["'][^>]*?(?:name|property)=["']([^"']+)["'][^>]*?>/gi;
  let m;
  const relevant =
    /^(citation_|og:|article:|twitter:(title|creator)|dc\.|DC\.|author|date|title|description)/i;
  while ((m = re.exec(html)) !== null && lines.length < 60) {
    const name = m[1] ?? m[4] ?? "";
    const content = m[2] ?? m[3] ?? "";
    if (name && content && relevant.test(name)) {
      lines.push(`${name}: ${decodeEntities(content).slice(0, 300)}`);
    }
  }
  return lines.join("\n");
}

function jsonLdAsText(html: string): string {
  const blocks: string[] = [];
  const re =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null && blocks.length < 3) {
    blocks.push(m[1].slice(0, 4000));
  }
  return blocks.join("\n---\n");
}

/** Texto visible: quita scripts/estilos/etiquetas y colapsa espacios. */
function visibleText(html: string, limit: number): string {
  const withoutBlocks = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const text = decodeEntities(
    withoutBlocks.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")
  );
  return text.slice(0, limit);
}

const EXTRACTION_SCHEMA = {
  type: "object" as const,
  properties: {
    title: {
      type: "string",
      description:
        "Título real del artículo, libro o página (no el nombre del sitio ni sufijos como ' | Sitio')",
    },
    authors: {
      type: "array",
      items: { type: "string" },
      description:
        'Autores en formato APA "Apellido, N." (iniciales). Vacío si no hay autor humano identificable.',
    },
    year: {
      type: ["integer", "null"],
      description: "Año de publicación (4 dígitos) o null si no aparece",
    },
    source: {
      type: "string",
      description:
        "Nombre de la revista, editorial, periódico o sitio web que publica el contenido",
    },
    doi: {
      type: "string",
      description:
        "DOI si aparece (solo el identificador, ej. 10.1000/xyz); cadena vacía si no",
    },
    kind: {
      type: "string",
      enum: ["articulo", "libro", "web", "otro"],
      description:
        "articulo = artículo académico/revista/paper; libro = libro o capítulo; web = página web, blog o noticia; otro = lo demás",
    },
    confidence: {
      type: "string",
      enum: ["alta", "media", "baja"],
      description: "Qué tan confiable es la extracción con la evidencia disponible",
    },
  },
  required: ["title", "authors", "year", "source", "doi", "kind", "confidence"],
  additionalProperties: false,
};

async function extractWithClaude(
  url: string,
  html: string
): Promise<Extraction | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  const evidence = [
    `URL: ${url}`,
    titleTag ? `<title>: ${decodeEntities(titleTag).slice(0, 300)}` : "",
    "",
    "== ETIQUETAS META ==",
    metaTagsAsText(html) || "(ninguna)",
    "",
    "== JSON-LD ==",
    jsonLdAsText(html) || "(ninguno)",
    "",
    "== INICIO DEL TEXTO VISIBLE DE LA PÁGINA ==",
    visibleText(html, 3500),
  ].join("\n");

  const anthropic = new Anthropic();
  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      output_config: {
        effort: "low",
        format: {
          type: "json_schema",
          schema: EXTRACTION_SCHEMA,
        },
      },
      system: [
        {
          type: "text",
          text: `Eres un bibliotecario experto en referencias bibliográficas (estilo BibGuru/Zotero). Recibes la evidencia extraída de una página web (URL, meta tags, JSON-LD y texto visible) y devuelves los datos bibliográficos REALES del contenido.

Reglas:
- Prioriza meta citation_* y JSON-LD sobre el texto visible; usa el texto visible para completar lo que falte (ej. autor en el byline, año en la fecha del artículo).
- Título limpio: sin el nombre del sitio, sin separadores tipo " | ", " - Sitio", " — Medio".
- Autores humanos en formato "Apellido, N." con iniciales. Organizaciones van con su nombre completo (ej. "Organización Mundial de la Salud"). Nunca inventes autores; si solo hay medio/organización, puede ir como autor corporativo si claramente firma el contenido, si no, deja la lista vacía.
- source = revista/editorial/periódico/sitio que publica.
- No inventes datos: si algo no está en la evidencia, déjalo vacío o null.`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: evidence }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;
    return JSON.parse(textBlock.text) as Extraction;
  } catch (err) {
    console.error("Claude extraction error:", err);
    return null;
  }
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
    return NextResponse.json(
      { error: "Solo se admiten URLs http(s)" },
      { status: 400 }
    );
  }
  if (isPrivateHost(url.hostname)) {
    return NextResponse.json({ error: "URL no permitida" }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(url.toString(), {
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) {
      return NextResponse.json(
        {
          error: `El sitio respondió ${res.status}. Prueba con otro enlace o llena los campos manualmente.`,
        },
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

  // 1) Extracción determinística (funciona sin ninguna API key)
  let extraction = extractHeuristic(url, html);

  // 2) Si el sitio no publica metadatos suficientes y hay key, Claude refuerza
  if (extraction.confidence !== "alta" && process.env.ANTHROPIC_API_KEY) {
    const enhanced = await extractWithClaude(url.toString(), html);
    if (enhanced?.title) {
      extraction = {
        ...enhanced,
        // Conservar lo estructurado si la IA no lo encontró
        authors: enhanced.authors.length ? enhanced.authors : extraction.authors,
        year: enhanced.year ?? extraction.year,
        doi: enhanced.doi || extraction.doi,
        source: enhanced.source || extraction.source,
      };
    }
  }

  if (!extraction.title) {
    return NextResponse.json(
      { error: "No se pudo identificar la referencia en esa página" },
      { status: 422 }
    );
  }

  return NextResponse.json({
    title: extraction.title,
    authors: extraction.authors.join("; "),
    year: extraction.year,
    source: extraction.source,
    url: url.toString(),
    doi: extraction.doi,
    kind: extraction.kind,
    confidence: extraction.confidence,
  });
}
