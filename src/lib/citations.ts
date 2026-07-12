import type { BibReference } from "./types";

export const CITATION_STYLES = ["APA 7", "IEEE"] as const;

export type CitationStyle = (typeof CITATION_STYLES)[number];

/**
 * Los autores se guardan como texto libre separado por ";".
 * Cada autor idealmente en formato "Apellido, N.".
 */
function splitAuthors(authors: string | null): string[] {
  if (!authors) return [];
  return authors
    .split(";")
    .map((a) => a.trim())
    .filter(Boolean);
}

function apaAuthors(list: string[]): string {
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} & ${list[1]}`;
  return `${list.slice(0, -1).join(", ")}, & ${list[list.length - 1]}`;
}

/** IEEE usa "N. Apellido" — invierte "Apellido, N." si aplica. */
function ieeeAuthor(author: string): string {
  const parts = author.split(",").map((p) => p.trim());
  if (parts.length === 2 && parts[1]) return `${parts[1]} ${parts[0]}`;
  return author;
}

function ieeeAuthors(list: string[]): string {
  const formatted = list.map(ieeeAuthor);
  if (formatted.length === 0) return "";
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`;
  return `${formatted.slice(0, -1).join(", ")}, and ${formatted[formatted.length - 1]}`;
}

export function formatCitation(
  ref: BibReference,
  style: CitationStyle
): string {
  const authors = splitAuthors(ref.authors);
  const link = ref.doi ? `https://doi.org/${ref.doi}` : (ref.url ?? "");

  if (style === "APA 7") {
    const parts: string[] = [];
    if (authors.length > 0) parts.push(`${apaAuthors(authors)}`);
    parts.push(ref.year ? `(${ref.year}).` : "(s.f.).");
    parts.push(`${ref.title}.`);
    if (ref.source) {
      parts.push(ref.kind === "articulo" ? `${ref.source}.` : `${ref.source}.`);
    }
    if (link) parts.push(link);
    return parts.join(" ").replace(/\.\./g, ".");
  }

  // IEEE
  const parts: string[] = [];
  if (authors.length > 0) parts.push(`${ieeeAuthors(authors)},`);
  parts.push(`"${ref.title},"`);
  if (ref.source) parts.push(`${ref.source},`);
  if (ref.year) parts.push(`${ref.year}.`);
  if (link) parts.push(`[En línea]. Disponible: ${link}`);
  return parts.join(" ");
}
