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

export type NeededForTarget = {
  /** Meta interpretada (clampeada 0..MAX_GRADE). */
  target: number;
  /** Ya está garantizada con lo acumulado. */
  achieved: boolean;
  /** No se puede alcanzar aunque saques 5.0 en todo lo restante. */
  unreachable: boolean;
  /** Nota uniforme requerida en el % restante (0..5). null si no aplica. */
  needed: number | null;
  /** Porcentaje del curso todavía sin calificar. */
  remainingPercent: number;
  /** Puntos que faltan sobre la escala 0..5 para llegar a la meta. */
  pointsMissing: number;
  /** Distribución sugerida por evaluación pendiente (misma nota en cada una). */
  perPending: { name: string; weight_percent: number; needed: number }[];
};

/**
 * Calcula la nota necesaria en las evaluaciones pendientes para cerrar la
 * materia con `target`. La nota devuelta es uniforme: si el estudiante saca
 * exactamente `needed` en cada evaluación restante (ponderada por su peso),
 * la nota final será `target` (dentro de la precisión de coma flotante).
 */
export function neededForTarget(
  evaluations: Evaluation[],
  rawTarget: number
): NeededForTarget {
  const target = Math.min(MAX_GRADE, Math.max(0, rawTarget));
  const graded = evaluations.filter((e) => e.grade !== null);
  const pending = evaluations.filter((e) => e.grade === null);
  const evaluatedPercent = graded.reduce((s, e) => s + e.weight_percent, 0);
  const accumulated = graded.reduce(
    (s, e) => s + (e.grade as number) * (e.weight_percent / 100),
    0
  );
  const remainingPercent = Math.max(0, 100 - evaluatedPercent);
  const pointsMissing = Math.max(0, target - accumulated);

  if (accumulated + 1e-9 >= target) {
    return {
      target,
      achieved: true,
      unreachable: false,
      needed: 0,
      remainingPercent,
      pointsMissing: 0,
      perPending: pending.map((p) => ({
        name: p.name,
        weight_percent: p.weight_percent,
        needed: 0,
      })),
    };
  }
  if (remainingPercent <= 0) {
    return {
      target,
      achieved: false,
      unreachable: true,
      needed: null,
      remainingPercent: 0,
      pointsMissing,
      perPending: [],
    };
  }
  const needed = (target - accumulated) / (remainingPercent / 100);
  if (needed > MAX_GRADE + 1e-9) {
    return {
      target,
      achieved: false,
      unreachable: true,
      needed: null,
      remainingPercent,
      pointsMissing,
      perPending: [],
    };
  }
  const uniform = Math.max(0, Math.min(MAX_GRADE, needed));
  return {
    target,
    achieved: false,
    unreachable: false,
    needed: uniform,
    remainingPercent,
    pointsMissing,
    perPending: pending.map((p) => ({
      name: p.name,
      weight_percent: p.weight_percent,
      needed: uniform,
    })),
  };
}

export function formatGrade(value: number): string {
  return value.toFixed(2).replace(/0$/, "").replace(/\.$/, ".0");
}
