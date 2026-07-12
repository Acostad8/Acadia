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

export function suggestSubject<T extends { id: string; name: string }>(
  filename: string,
  subjects: T[]
): T | null {
  const name = normalize(filename);
  let best: T | null = null;
  let bestScore = 0;

  for (const subject of subjects) {
    const tokens = normalize(subject.name)
      .split(" ")
      .filter((t) => t.length > 2 && !STOPWORDS.has(t));
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
