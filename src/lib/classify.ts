import type { SubjectSubfolder } from "@/lib/doc-types";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[_\-.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const TYPE_KEYWORDS: [RegExp, SubjectSubfolder][] = [
  [/\btaller(es)?\b/, "Talleres"],
  [/\b(parcial(es)?|examen(es)?|quiz|quices|evaluacion)\b/, "Parciales"],
  [/\b(lab(oratorio)?s?|practica)\b/, "Laboratorios"],
  [/\bproyecto?s?\b/, "Proyectos"],
  [/\b(investigacion(es)?|articulo|paper|ensayo)\b/, "Investigaciones"],
  [/\b(referencia?s?|bibliografia|libro|guia)\b/, "Referencias"],
  [/\b(apuntes?|notas?|clase|resumen)\b/, "Apuntes"],
];

export function suggestDocType(filename: string): SubjectSubfolder {
  const name = normalize(filename);
  for (const [re, type] of TYPE_KEYWORDS) {
    if (re.test(name)) return type;
  }
  return "Apuntes";
}

const STOPWORDS = new Set(["de", "del", "la", "el", "los", "las", "y", "en", "i", "ii", "iii", "a", "b", "c"]);

function subjectTokens(name: string): string[] {
  return normalize(name)
    .split(" ")
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

export function suggestSubject<T extends { id: string; name: string }>(
  filename: string,
  subjects: T[]
): T | null {
  const name = normalize(filename);
  let best: T | null = null;
  let bestScore = 0;

  for (const subject of subjects) {
    const tokens = subjectTokens(subject.name);
    if (tokens.length === 0) continue;
    const hits = tokens.filter((t) => name.includes(t)).length;
    const score = hits / tokens.length;
    if (hits > 0 && score > bestScore) {
      best = subject;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Clasifica cruzando el contenido del documento con las materias.
 * El nombre completo de la materia en el texto pesa mucho más que
 * tokens sueltos (que aparecen por coincidencia en cualquier documento).
 */
export function suggestSubjectFromText<
  T extends { id: string; name: string; professor?: string | null }
>(text: string, subjects: T[]): { subject: T; confidence: "alta" | "baja" } | null {
  const normalized = normalize(text);
  let best: T | null = null;
  let bestScore = 0;

  for (const subject of subjects) {
    let score = 0;

    const fullName = normalize(subject.name);
    if (fullName && normalized.includes(fullName)) score += 10;

    const tokens = subjectTokens(subject.name);
    for (const token of tokens) {
      const occurrences = normalized.split(token).length - 1;
      score += Math.min(occurrences, 5);
    }

    if (subject.professor) {
      const prof = normalize(subject.professor);
      if (prof.length > 4 && normalized.includes(prof)) score += 8;
    }

    if (score > bestScore) {
      best = subject;
      bestScore = score;
    }
  }

  if (!best || bestScore < 3) return null;
  return { subject: best, confidence: bestScore >= 10 ? "alta" : "baja" };
}
