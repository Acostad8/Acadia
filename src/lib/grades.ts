import type { Evaluation } from "./types";

export const PASSING_GRADE = 3.0;
export const MAX_GRADE = 5.0;
export const GRADE_TARGETS = [3.0, 4.0, 4.5, 5.0] as const;

export type SubjectStatus = "aprobada" | "en_riesgo" | "perdida";

export type GradeSummary = {
  /** Puntos ya asegurados sobre la escala 0–5 (suma de nota × peso / 100). */
  accumulated: number;
  /** Porcentaje del curso ya calificado (suma de pesos con nota). */
  evaluatedPercent: number;
  /** Porcentaje aún sin calificar (100 − evaluado). */
  remainingPercent: number;
  /** Promedio ponderado de lo calificado hasta ahora. */
  currentAverage: number | null;
  /** Nota máxima alcanzable si todo lo restante fuera 5.0. */
  maxAchievable: number;
  /** Nota mínima necesaria en lo restante para cada meta; null si es inalcanzable o ya no queda porcentaje. */
  neededFor: { target: number; needed: number | null; achieved: boolean }[];
  status: SubjectStatus;
};

export function summarizeGrades(evaluations: Evaluation[]): GradeSummary {
  const graded = evaluations.filter((e) => e.grade !== null);
  const evaluatedPercent = graded.reduce((s, e) => s + e.weight_percent, 0);
  const accumulated = graded.reduce(
    (s, e) => s + (e.grade as number) * (e.weight_percent / 100),
    0
  );
  const remainingPercent = Math.max(0, 100 - evaluatedPercent);
  const maxAchievable = accumulated + MAX_GRADE * (remainingPercent / 100);
  const currentAverage =
    evaluatedPercent > 0 ? accumulated / (evaluatedPercent / 100) : null;

  const neededFor = GRADE_TARGETS.map((target) => {
    if (accumulated >= target) {
      return { target, needed: null, achieved: true };
    }
    if (remainingPercent <= 0 || maxAchievable < target) {
      return { target, needed: null, achieved: false };
    }
    const needed = (target - accumulated) / (remainingPercent / 100);
    return { target, needed: Math.max(0, needed), achieved: false };
  });

  let status: SubjectStatus;
  if (accumulated >= PASSING_GRADE) status = "aprobada";
  else if (maxAchievable < PASSING_GRADE) status = "perdida";
  else status = "en_riesgo";

  return {
    accumulated,
    evaluatedPercent,
    remainingPercent,
    currentAverage,
    maxAchievable,
    neededFor,
    status,
  };
}

export function formatGrade(value: number): string {
  return value.toFixed(2).replace(/0$/, "").replace(/\.$/, ".0");
}
