import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { computeStreak } from "./streak";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function sess(offsets: number[]): { started_at: string }[] {
  return offsets.map((o) => ({ started_at: daysAgo(o) }));
}

describe("computeStreak", () => {
  it("sin sesiones: current 0, longest 0, hasToday false", () => {
    const r = computeStreak([]);
    expect(r.current).toBe(0);
    expect(r.longest).toBe(0);
    expect(r.hasToday).toBe(false);
  });

  it("solo hoy: current 1, longest 1, hasToday true", () => {
    const r = computeStreak(sess([0]));
    expect(r.current).toBe(1);
    expect(r.longest).toBe(1);
    expect(r.hasToday).toBe(true);
  });

  it("solo ayer (no hoy): current 1, longest 1, hasToday false (racha se preserva)", () => {
    const r = computeStreak(sess([1]));
    expect(r.current).toBe(1);
    expect(r.longest).toBe(1);
    expect(r.hasToday).toBe(false);
  });

  it("hoy + ayer + antier: current 3", () => {
    const r = computeStreak(sess([0, 1, 2]));
    expect(r.current).toBe(3);
    expect(r.longest).toBe(3);
    expect(r.hasToday).toBe(true);
  });

  it("gap: sesiones hoy y hace 3 días → current 1 (racha rota)", () => {
    const r = computeStreak(sess([0, 3, 4, 5]));
    expect(r.current).toBe(1);
    expect(r.longest).toBe(3);
  });

  it("gap con ayer ok pero no hoy → mantiene racha ayer hacia atrás", () => {
    const r = computeStreak(sess([1, 2, 3]));
    expect(r.current).toBe(3);
    expect(r.hasToday).toBe(false);
  });

  it("gap dos días atrás (sin ayer) → current 0", () => {
    const r = computeStreak(sess([2, 3, 4]));
    expect(r.current).toBe(0);
    expect(r.longest).toBe(3);
  });

  it("múltiples sesiones el mismo día cuentan como un solo día", () => {
    const today = new Date().toISOString();
    const s = [
      { started_at: today },
      { started_at: today },
      { started_at: today },
    ];
    const r = computeStreak(s);
    expect(r.current).toBe(1);
    expect(r.longest).toBe(1);
    expect(r.hasToday).toBe(true);
  });

  it("longest > current cuando hubo racha larga anterior", () => {
    const r = computeStreak(sess([0, 5, 6, 7, 8, 9]));
    expect(r.current).toBe(1);
    expect(r.longest).toBe(5);
  });

  it("racha larga continua: hoy hasta 10 días atrás", () => {
    const r = computeStreak(sess([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    expect(r.current).toBe(11);
    expect(r.longest).toBe(11);
    expect(r.hasToday).toBe(true);
  });

  it("sesión de hoy en cualquier hora la cuenta", () => {
    const now = new Date();
    now.setHours(3, 15, 0, 0);
    const r = computeStreak([{ started_at: now.toISOString() }]);
    expect(r.hasToday).toBe(true);
    expect(r.current).toBe(1);
  });

  it("sesiones fuera de orden se ordenan correctamente para longest", () => {
    const r = computeStreak(sess([5, 3, 4]));
    expect(r.longest).toBe(3);
  });

  it("racha rota + inicia nueva: longest guarda la mejor", () => {
    // días: 0 (hoy), 1, 2 (racha actual 3) + gap + 6, 7, 8, 9 (racha 4)
    const r = computeStreak(sess([0, 1, 2, 6, 7, 8, 9]));
    expect(r.current).toBe(3);
    expect(r.longest).toBe(4);
  });
});

describe("computeStreak · edge cases con fecha fija", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    // Fijar "hoy" a las 12:00 del 2026-07-15 (miércoles, TZ local)
    vi.setSystemTime(new Date(2026, 6, 15, 12, 0, 0));
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it("hoy 2026-07-15 con sesión 2026-07-15 y 2026-07-14 → current 2", () => {
    const r = computeStreak([
      { started_at: new Date(2026, 6, 15, 8, 0, 0).toISOString() },
      { started_at: new Date(2026, 6, 14, 22, 30, 0).toISOString() },
    ]);
    expect(r.current).toBe(2);
    expect(r.hasToday).toBe(true);
  });

  it("cambio de mes en la racha", () => {
    const r = computeStreak([
      { started_at: new Date(2026, 6, 1, 10, 0, 0).toISOString() },
      { started_at: new Date(2026, 5, 30, 10, 0, 0).toISOString() },
      { started_at: new Date(2026, 5, 29, 10, 0, 0).toISOString() },
    ]);
    expect(r.longest).toBe(3);
  });
});
