import type {
  CalendarEvent,
  Evaluation,
  ScheduleBlock,
  Subject,
} from "@/lib/types";
import { summarizeGrades } from "@/lib/grades";

export const WIDGET_IDS = [
  "next-parcial",
  "next-48h",
  "streak",
  "quote",
  "study-climate",
  "risk-subjects",
] as const;

export type WidgetId = (typeof WIDGET_IDS)[number];

export const DEFAULT_LAYOUT: WidgetId[] = [
  "next-parcial",
  "next-48h",
  "study-climate",
  "streak",
  "risk-subjects",
  "quote",
];

export function normalizeLayout(input: unknown): WidgetId[] {
  if (!Array.isArray(input)) return DEFAULT_LAYOUT;
  const set = new Set(WIDGET_IDS);
  const seen = new Set<string>();
  const filtered: WidgetId[] = [];
  for (const item of input) {
    if (typeof item !== "string") continue;
    if (!set.has(item as WidgetId)) continue;
    if (seen.has(item)) continue;
    seen.add(item);
    filtered.push(item as WidgetId);
  }
  for (const wid of DEFAULT_LAYOUT) {
    if (!seen.has(wid)) filtered.push(wid);
  }
  return filtered;
}

export type StudyDay = { date: string; minutes: number };

export type DashboardPayload = {
  subjects: Subject[];
  events: CalendarEvent[];
  evaluations: Evaluation[];
  blocks: ScheduleBlock[];
  studyByDay: StudyDay[];
  streak: { current: number; longest: number; hasToday: boolean };
  now: string;
};

export type Suggestion = {
  title: string;
  action?: { href: string; label: string };
};

const QUOTES = [
  { q: "La disciplina es el puente entre las metas y los logros.", a: "Jim Rohn" },
  { q: "Aprender nunca agota la mente.", a: "Leonardo da Vinci" },
  {
    q: "El único modo de hacer un gran trabajo es amar lo que haces.",
    a: "Steve Jobs",
  },
  { q: "Estudia como si vivieras para siempre.", a: "Mahatma Gandhi" },
  {
    q: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.",
    a: "Robert Collier",
  },
  {
    q: "La única manera de superar el miedo al fracaso es fracasar.",
    a: "James Clear",
  },
  {
    q: "No te compares con nadie. Compárate con quien eras ayer.",
    a: "Jordan Peterson",
  },
] as const;

export function quoteOfDay(now: Date): { q: string; a: string } {
  const day = Math.floor(now.getTime() / 86400000);
  return QUOTES[day % QUOTES.length];
}

export function focusWidgetFor(hour: number): WidgetId {
  if (hour < 12) return "next-48h";
  if (hour < 19) return "next-parcial";
  return "study-climate";
}

export function nextParcial(events: CalendarEvent[], nowMs: number): CalendarEvent | null {
  return (
    events
      .filter((e) => !e.completed && new Date(e.due_at).getTime() >= nowMs)
      .filter((e) => e.type === "parcial" || e.type === "quiz" || e.type === "tarea")
      .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())[0] ??
    null
  );
}

export function eventsWithin48h(events: CalendarEvent[], nowMs: number): CalendarEvent[] {
  const limit = nowMs + 48 * 60 * 60 * 1000;
  return events
    .filter((e) => !e.completed)
    .filter((e) => {
      const t = new Date(e.due_at).getTime();
      return t >= nowMs && t <= limit;
    })
    .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
}

export function riskSubjects(
  subjects: Subject[],
  evaluations: Evaluation[]
): { subject: Subject; accumulated: number; evaluatedPercent: number }[] {
  return subjects
    .map((subject) => {
      const evals = evaluations.filter((e) => e.subject_id === subject.id);
      const summary = summarizeGrades(evals);
      return {
        subject,
        accumulated: summary.accumulated ?? 0,
        evaluatedPercent: summary.evaluatedPercent,
      };
    })
    .filter((r) => r.evaluatedPercent >= 20 && r.accumulated < 3.0)
    .sort((a, b) => a.accumulated - b.accumulated)
    .slice(0, 3);
}

export function studyLast7Days(sessions: StudyDay[], now: Date): StudyDay[] {
  const days: StudyDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const found = sessions.find((s) => s.date === key);
    days.push({ date: key, minutes: found?.minutes ?? 0 });
  }
  return days;
}

export function computeSuggestion(payload: DashboardPayload): Suggestion | null {
  const now = new Date(payload.now);
  const nowMs = now.getTime();
  const risks = riskSubjects(payload.subjects, payload.evaluations);

  const soonParcial = payload.events.find((e) => {
    if (e.completed) return false;
    if (e.type !== "parcial") return false;
    const days = (new Date(e.due_at).getTime() - nowMs) / 86400000;
    return days >= 0 && days <= 5;
  });

  if (soonParcial) {
    const subject = payload.subjects.find((s) => s.id === soonParcial.subject_id);
    const risk = risks.find((r) => r.subject.id === soonParcial.subject_id);
    const days = Math.max(
      0,
      Math.round((new Date(soonParcial.due_at).getTime() - nowMs) / 86400000)
    );
    const rest = risk
      ? `y vas ${risk.accumulated.toFixed(1)}`
      : "prepárate con tiempo";
    return {
      title: `Estudia ${subject?.name ?? "esta materia"} hoy 30 min, parcial en ${days} día${days === 1 ? "" : "s"} ${rest}.`,
      action: subject
        ? { href: `/materias/${subject.id}`, label: "Abrir materia" }
        : undefined,
    };
  }

  if (risks.length > 0) {
    const top = risks[0];
    return {
      title: `${top.subject.name} está en riesgo (${top.accumulated.toFixed(1)}). Programa 1h de repaso.`,
      action: { href: `/materias/${top.subject.id}`, label: "Abrir materia" },
    };
  }

  if (!payload.streak.hasToday && payload.streak.current > 0) {
    return {
      title: `Estudia hoy para mantener tu racha de ${payload.streak.current} día${payload.streak.current === 1 ? "" : "s"}.`,
      action: { href: "/estudio", label: "Ir a estudio" },
    };
  }

  if (payload.streak.current === 0) {
    return {
      title: "Empieza tu racha: registra una sesión de estudio hoy.",
      action: { href: "/estudio", label: "Empezar" },
    };
  }

  return null;
}
