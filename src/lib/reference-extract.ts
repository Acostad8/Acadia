// Extracción de datos bibliográficos desde el HTML de una página
// (estilo Zotero/BibGuru): JSON-LD + meta citation_* + OpenGraph + byline.
// Funciona sin ninguna API key.

export type Extraction = {
  title: string;
  authors: string[];
  year: number | null;
  source: string;
  doi: string;
  kind: "articulo" | "libro" | "web" | "otro";
  confidence: "alta" | "media" | "baja";
};

export function decodeEntities(text: string): string {
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

/** "Nombre Segundo Apellido" → "Apellido, N. S." — si ya viene "Apellido, N." se respeta. */
export function toApaAuthor(raw: string): string {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) return "";
  if (name.includes(",")) return name;
  const parts = name.split(" ");
  if (parts.length === 1) return name;
  // Nombres corporativos largos se dejan tal cual
  if (parts.length > 4) return name;
  const last = parts[parts.length - 1];
  const initials = parts
    .slice(0, -1)
    .map((p) => `${p.charAt(0).toUpperCase()}.`)
    .join(" ");
  return `${last}, ${initials}`;
}

function metaAll(html: string, name: string): string[] {
  const results: string[] = [];
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*(?:name|property)=["']${name}["']`,
    "gi"
  );
  let m;
  while ((m = re.exec(html)) !== null) {
    const value = decodeEntities(m[1] ?? m[2] ?? "");
    if (value) results.push(value);
  }
  return results;
}

function metaFirst(html: string, names: string[]): string {
  for (const name of names) {
    const values = metaAll(html, name);
    if (values.length) return values[0];
  }
  return "";
}

type LdNode = {
  "@type"?: string | string[];
  headline?: string;
  name?: string;
  datePublished?: string;
  dateCreated?: string;
  author?: unknown;
  creator?: unknown;
  publisher?: { name?: string } | string;
  isPartOf?: { name?: string };
  "@graph"?: LdNode[];
};

function ldAuthorNames(author: unknown): string[] {
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

const LD_TYPES = [
  "Article",
  "NewsArticle",
  "BlogPosting",
  "ScholarlyArticle",
  "Report",
  "Book",
  "Chapter",
  "WebPage",
];

function parseJsonLd(html: string): {
  title?: string;
  authors: string[];
  date?: string;
  source?: string;
  isBook: boolean;
} | null {
  const re =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  let fallback: ReturnType<typeof parseJsonLd> = null;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1]) as LdNode | LdNode[];
      const nodes: LdNode[] = Array.isArray(parsed)
        ? parsed
        : parsed["@graph"]
          ? parsed["@graph"]
          : [parsed];
      for (const node of nodes) {
        const types = (
          Array.isArray(node["@type"]) ? node["@type"] : [node["@type"] ?? ""]
        ).filter(Boolean) as string[];
        if (!types.some((t) => LD_TYPES.includes(t))) continue;
        const publisher =
          typeof node.publisher === "string"
            ? node.publisher
            : node.publisher?.name;
        const result = {
          title: node.headline ?? node.name,
          authors: ldAuthorNames(node.author ?? node.creator),
          date: node.datePublished ?? node.dateCreated,
          source: publisher ?? node.isPartOf?.name,
          isBook: types.includes("Book") || types.includes("Chapter"),
        };
        // WebPage genérico solo como último recurso
        if (types.some((t) => t !== "WebPage" && LD_TYPES.includes(t))) {
          return result;
        }
        fallback = fallback ?? result;
      }
    } catch {
      // Bloque JSON-LD malformado: probar el siguiente
    }
  }
  return fallback;
}

/** Quita sufijos de sitio del título: "Artículo | Medio", "Artículo - Medio". */
function cleanTitle(title: string, siteName: string, hostname: string): string {
  let t = title.trim();
  const separators = [" | ", " – ", " — ", " · ", " :: ", " - "];
  const site = siteName.toLowerCase();
  // Partes significativas del dominio: "es.wikipedia.org" → ["wikipedia"]
  const hostParts = hostname
    .replace(/^www\./, "")
    .split(".")
    .filter((p) => p.length > 3);
  for (const sep of separators) {
    const idx = t.lastIndexOf(sep);
    if (idx >= 4) {
      const suffix = t.slice(idx + sep.length).trim().toLowerCase();
      if (
        (site && (suffix === site || site.includes(suffix))) ||
        hostParts.some((p) => suffix === p || suffix.includes(p))
      ) {
        t = t.slice(0, idx).trim();
      }
    }
  }
  return t;
}

/** Byline visible: <a rel="author">, clases author/byline. */
function bylineAuthor(html: string): string {
  const patterns = [
    /<a[^>]+rel=["']author["'][^>]*>([^<]{3,60})<\/a>/i,
    /<span[^>]+class=["'][^"']*(?:author-name|byline__name|c-byline)[^"']*["'][^>]*>([^<]{3,60})<\/span>/i,
    /<meta[^>]+name=["']parsely-author["'][^>]*content=["']([^"']+)["']/i,
  ];
  for (const re of patterns) {
    const m = re.exec(html);
    if (m) {
      const value = decodeEntities(m[1]).replace(/^por\s+/i, "").trim();
      if (value && !/^https?:/i.test(value)) return value;
    }
  }
  return "";
}

/** Extracción determinística: JSON-LD + citation_* + OpenGraph + byline. */
export function extractHeuristic(url: URL, html: string): Extraction {
  const ld = parseJsonLd(html);

  const citationTitle = metaFirst(html, ["citation_title"]);
  const citationAuthors = metaAll(html, "citation_author");
  const citationDate = metaFirst(html, [
    "citation_publication_date",
    "citation_date",
    "citation_online_date",
  ]);
  const citationSource = metaFirst(html, [
    "citation_journal_title",
    "citation_conference_title",
    "citation_publisher",
  ]);
  const citationDoi = metaFirst(html, ["citation_doi"]);
  const citationIsBook = Boolean(metaFirst(html, ["citation_isbn"]));

  const ogSite = metaFirst(html, ["og:site_name"]);
  const ogTitle = metaFirst(html, ["og:title", "twitter:title"]);
  const metaAuthorList = [
    ...metaAll(html, "author"),
    ...metaAll(html, "article:author"),
    ...metaAll(html, "dc.creator"),
    ...metaAll(html, "DC.creator"),
  ].filter((a) => !/^https?:/i.test(a));
  const metaDate = metaFirst(html, [
    "article:published_time",
    "article:modified_time",
    "date",
    "dc.date",
    "DC.date.issued",
    "sailthru.date",
  ]);
  const timeTag = /<time[^>]+datetime=["']([^"']+)["']/i.exec(html)?.[1] ?? "";
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];

  // og:title suele ser más fiable que JSON-LD (algunos sitios ponen la
  // descripción en headline/name, p. ej. Wikipedia)
  const rawTitle =
    citationTitle ||
    ogTitle ||
    ld?.title ||
    (titleTag ? decodeEntities(titleTag) : "");
  const title = cleanTitle(rawTitle, ogSite, url.hostname);

  // citation_author ya viene un autor por etiqueta (a menudo "Apellido, Nombre"):
  // solo separar por ";". Las demás fuentes pueden traer listas en una cadena.
  const splitLoose = (a: string) =>
    a.split(/;|\s+y\s+|\s+and\s+|,(?=\s+[A-ZÁÉÍÓÚ][a-z]+\s+[A-ZÁÉÍÓÚ])/);
  const authorsRaw = citationAuthors.length
    ? citationAuthors.flatMap((a) => a.split(";"))
    : ld?.authors.length
      ? ld.authors.flatMap(splitLoose)
      : metaAuthorList.length
        ? metaAuthorList.flatMap(splitLoose)
        : bylineAuthor(html)
          ? splitLoose(bylineAuthor(html))
          : [];
  const authors = authorsRaw
    .map((a) => toApaAuthor(a))
    .filter(Boolean)
    .slice(0, 10);

  const dateRaw = citationDate || ld?.date || metaDate || timeTag;
  const yearMatch = /(19|20)\d{2}/.exec(dateRaw);

  const source =
    citationSource || ld?.source || ogSite || url.hostname.replace(/^www\./, "");

  const isAcademic = Boolean(citationTitle || citationDoi);
  const kind: Extraction["kind"] =
    citationIsBook || ld?.isBook ? "libro" : isAcademic ? "articulo" : "web";

  // Confianza: alta si hay metadatos estructurados con autor y fecha
  const confidence: Extraction["confidence"] =
    (isAcademic || ld) && authors.length && yearMatch
      ? "alta"
      : authors.length || yearMatch
        ? "media"
        : "baja";

  return {
    title,
    authors,
    year: yearMatch ? Number(yearMatch[0]) : null,
    source,
    doi: citationDoi,
    kind,
    confidence,
  };
}
