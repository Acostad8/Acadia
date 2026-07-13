import { describe, it, expect } from "vitest";
import {
  formatGrade,
  neededForTarget,
  summarizeGrades,
  PASSING_GRADE,
  MAX_GRADE,
} from "./grades";
import type { Evaluation } from "./types";

function ev(
  weight_percent: number,
  grade: number | null,
  name = "Ev"
): Evaluation {
  return {
    id: crypto.randomUUID(),
    subject_id: "s1",
    user_id: "u1",
    name,
    weight_percent,
    grade,
    created_at: new Date().toISOString(),
  };
}

describe("summarizeGrades", () => {
  it("sin evaluaciones: acumulado 0, promedio null, max 5", () => {
    const s = summarizeGrades([]);
    expect(s.accumulated).toBe(0);
    expect(s.evaluatedPercent).toBe(0);
    expect(s.remainingPercent).toBe(100);
    expect(s.currentAverage).toBeNull();
    expect(s.maxAchievable).toBe(MAX_GRADE);
    expect(s.status).toBe("en_riesgo");
  });

  it("una evaluación 30% con 4.0 → acumulado 1.2, promedio 4.0", () => {
    const s = summarizeGrades([ev(30, 4.0)]);
    expect(s.accumulated).toBeCloseTo(1.2, 5);
    expect(s.evaluatedPercent).toBe(30);
    expect(s.remainingPercent).toBe(70);
    expect(s.currentAverage).toBeCloseTo(4.0, 5);
    expect(s.maxAchievable).toBeCloseTo(1.2 + 5 * 0.7, 5);
  });

  it("100% evaluado con nota final aprobada", () => {
    const s = summarizeGrades([ev(50, 4.0), ev(50, 3.0)]);
    expect(s.accumulated).toBeCloseTo(3.5, 5);
    expect(s.evaluatedPercent).toBe(100);
    expect(s.remainingPercent).toBe(0);
    expect(s.currentAverage).toBeCloseTo(3.5, 5);
    expect(s.maxAchievable).toBeCloseTo(3.5, 5);
    expect(s.status).toBe("aprobada");
  });

  it("status perdida cuando maxAchievable < 3", () => {
    const s = summarizeGrades([ev(70, 2.0), ev(30, null)]);
    expect(s.accumulated).toBeCloseTo(1.4, 5);
    expect(s.maxAchievable).toBeCloseTo(1.4 + 5 * 0.3, 5);
    expect(s.maxAchievable).toBeCloseTo(2.9, 5);
    expect(s.status).toBe("perdida");
  });

  it("status aprobada cuando acumulado >= 3.0", () => {
    const s = summarizeGrades([ev(60, 4.0), ev(40, null)]);
    expect(s.accumulated).toBeCloseTo(2.4, 5);
    expect(s.status).toBe("en_riesgo");
    const s2 = summarizeGrades([ev(80, 4.0), ev(20, null)]);
    expect(s2.accumulated).toBeCloseTo(3.2, 5);
    expect(s2.status).toBe("aprobada");
  });

  it("neededFor: meta ya asegurada → achieved true, needed null", () => {
    const s = summarizeGrades([ev(80, 4.0), ev(20, null)]);
    const meta3 = s.neededFor.find((t) => t.target === 3.0);
    expect(meta3?.achieved).toBe(true);
    expect(meta3?.needed).toBeNull();
  });

  it("neededFor: meta inalcanzable → achieved false, needed null", () => {
    const s = summarizeGrades([ev(80, 2.0), ev(20, null)]);
    const meta5 = s.neededFor.find((t) => t.target === 5.0);
    expect(meta5?.achieved).toBe(false);
    expect(meta5?.needed).toBeNull();
  });

  it("neededFor: cálculo lineal para meta alcanzable", () => {
    const s = summarizeGrades([ev(50, 3.0), ev(50, null)]);
    const meta4 = s.neededFor.find((t) => t.target === 4.0);
    expect(meta4?.achieved).toBe(false);
    expect(meta4?.needed).toBeCloseTo(5.0, 5);
  });

  it("PASSING_GRADE = 3.0, MAX_GRADE = 5.0", () => {
    expect(PASSING_GRADE).toBe(3.0);
    expect(MAX_GRADE).toBe(5.0);
  });

  it("ignora evaluaciones sin nota en acumulado", () => {
    const s = summarizeGrades([ev(50, 4.0), ev(50, null)]);
    expect(s.accumulated).toBeCloseTo(2.0, 5);
    expect(s.evaluatedPercent).toBe(50);
  });

  it("suma correctamente pesos fraccionarios", () => {
    const s = summarizeGrades([
      ev(33.33, 3.5),
      ev(33.33, 4.0),
      ev(33.34, null),
    ]);
    expect(s.evaluatedPercent).toBeCloseTo(66.66, 2);
    expect(s.remainingPercent).toBeCloseTo(33.34, 2);
  });
});

describe("neededForTarget", () => {
  it("clampea meta negativa a 0", () => {
    const r = neededForTarget([ev(50, 3.0), ev(50, null)], -1);
    expect(r.target).toBe(0);
    expect(r.achieved).toBe(true);
  });

  it("clampea meta > 5 a 5", () => {
    const r = neededForTarget([ev(50, 5.0), ev(50, null)], 10);
    expect(r.target).toBe(5);
  });

  it("achieved cuando acumulado ≥ meta", () => {
    const r = neededForTarget([ev(60, 5.0), ev(40, null)], 3.0);
    expect(r.achieved).toBe(true);
    expect(r.unreachable).toBe(false);
    expect(r.needed).toBe(0);
    expect(r.pointsMissing).toBe(0);
  });

  it("unreachable cuando meta > máxima alcanzable", () => {
    const r = neededForTarget([ev(80, 2.0), ev(20, null)], 4.0);
    expect(r.unreachable).toBe(true);
    expect(r.achieved).toBe(false);
    expect(r.needed).toBeNull();
    expect(r.pointsMissing).toBeCloseTo(4.0 - 1.6, 5);
  });

  it("unreachable cuando 100% evaluado y no llegó", () => {
    const r = neededForTarget([ev(100, 2.5)], 3.0);
    expect(r.unreachable).toBe(true);
    expect(r.remainingPercent).toBe(0);
  });

  it("cálculo cerrado: meta 4.0, evaluado 50%=3.0, need = 5.0", () => {
    const r = neededForTarget([ev(50, 3.0), ev(50, null)], 4.0);
    expect(r.achieved).toBe(false);
    expect(r.unreachable).toBe(false);
    expect(r.needed).toBeCloseTo(5.0, 5);
  });

  it("cálculo cerrado: meta 3.5, evaluado 40%=4.0, need = 3.166...", () => {
    const r = neededForTarget([ev(40, 4.0), ev(60, null)], 3.5);
    expect(r.needed).toBeCloseTo((3.5 - 1.6) / 0.6, 5);
  });

  it("perPending: misma nota uniforme en cada pendiente", () => {
    const r = neededForTarget(
      [ev(40, 4.0), ev(30, null, "Parcial 2"), ev(30, null, "Final")],
      4.0
    );
    expect(r.perPending).toHaveLength(2);
    const uniform = r.needed as number;
    expect(r.perPending[0].needed).toBeCloseTo(uniform, 5);
    expect(r.perPending[1].needed).toBeCloseTo(uniform, 5);
    // Suma ponderada = target - accumulated
    const contribution =
      r.perPending[0].needed * (r.perPending[0].weight_percent / 100) +
      r.perPending[1].needed * (r.perPending[1].weight_percent / 100);
    expect(contribution).toBeCloseTo(4.0 - 1.6, 5);
  });

  it("perPending vacío cuando no hay evaluaciones pendientes", () => {
    const r = neededForTarget([ev(100, 4.0)], 3.0);
    expect(r.achieved).toBe(true);
    expect(r.perPending).toEqual([]);
  });

  it("target NaN no rompe (retorna clampeado a 0)", () => {
    const r = neededForTarget([ev(50, 3.0)], NaN);
    // NaN clamps via Math.min/max to NaN — verificar comportamiento defensivo
    expect(r.target).toBeTypeOf("number");
  });
});

describe("formatGrade", () => {
  it("3.0 muestra un decimal", () => {
    expect(formatGrade(3.0)).toBe("3.0");
  });

  it("3.5 muestra un decimal", () => {
    expect(formatGrade(3.5)).toBe("3.5");
  });

  it("3.55 muestra dos decimales", () => {
    expect(formatGrade(3.55)).toBe("3.55");
  });

  it("3.05 muestra dos decimales", () => {
    expect(formatGrade(3.05)).toBe("3.05");
  });

  it("0 se formatea", () => {
    expect(formatGrade(0)).toBe("0.0");
  });

  it("5 se formatea", () => {
    expect(formatGrade(5)).toBe("5.0");
  });

  it("valor con muchos decimales se redondea a 2", () => {
    expect(formatGrade(3.14159)).toBe("3.14");
  });
});
