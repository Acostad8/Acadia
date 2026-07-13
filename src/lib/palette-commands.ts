import { es } from "chrono-node";

export type CommandContext = {
  subjects: { id: string; name: string; color: string | null }[];
};

export type CommandKind =
  | "new-event"
  | "new-study"
  | "new-subject"
  | "import-schedule"
  | "focus-dashboard"
  | "search-docs";

export type ResolvedCommand = {
  kind: CommandKind;
  label: string;
  hint?: string;
  execute: () =>
    | { href: string }
    | { customEvent: string; detail: unknown }
    | { customEvent: string; detail: unknown; href: string };
};

const EVENT_TYPE_HINTS: Record<string, string> = {
  parcial: "parcial",
  quiz: "quiz",
  quizz: "quiz",
  tarea: "tarea",
  taller: "taller",
  laboratorio: "laboratorio",
  lab: "laboratorio",
  exposicion: "exposicion",
  exposición: "exposicion",
};

function detectType(text: string): string {
  const norm = text.toLowerCase();
  for (const [k, v] of Object.entries(EVENT_TYPE_HINTS)) {
    if (norm.includes(k)) return v;
  }
  return "tarea";
}

function detectSubject(text: string, ctx: CommandContext): string | null {
  const norm = text.toLowerCase();
  for (const s of ctx.subjects) {
    if (norm.includes(s.name.toLowerCase())) return s.id;
    const firstWord = s.name.toLowerCase().split(/\s+/)[0];
    if (firstWord.length > 3 && norm.includes(firstWord)) return s.id;
  }
  return null;
}

function stripDate(input: string, matched: string): string {
  return input.replace(matched, " ").replace(/\s+/g, " ").trim();
}

export function parseCommand(input: string, ctx: CommandContext): ResolvedCommand[] {
  const raw = input.replace(/^>\s*/, "").trim();
  const commands: ResolvedCommand[] = [];

  if (!raw) {
    commands.push(
      {
        kind: "new-event",
        label: "Nuevo evento…",
        hint: "> evento Parcial 1 en cálculo mañana 8pm",
        execute: () => ({ href: "/calendario" }),
      },
      {
        kind: "new-study",
        label: "Empezar sesión de estudio",
        hint: "Pomodoro 25 minutos",
        execute: () => ({ href: "/estudio" }),
      },
      {
        kind: "new-subject",
        label: "Nueva materia manual",
        hint: "Ir a semestres",
        execute: () => ({ href: "/semestres" }),
      },
      {
        kind: "import-schedule",
        label: "Importar horario desde PDF",
        hint: "Reemplaza el semestre actual",
        execute: () => ({ href: "/onboarding/schedule-import" }),
      },
      {
        kind: "focus-dashboard",
        label: "Activar modo enfoque",
        hint: "Un solo widget grande",
        execute: () => ({
          customEvent: "acadia:toggle-focus",
          detail: {},
          href: "/dashboard",
        }),
      }
    );
    return commands;
  }

  const norm = raw.toLowerCase();
  const isEvent = /^e(v(e(nto?)?)?)?\b/.test(norm) || norm.startsWith("nuevo evento");
  const isStudy = /^(est(udiar?)?|pomodoro|study)\b/.test(norm);
  const isImport = /^(imp|horario|pdf)\b/.test(norm);
  const isFocus = /^(foco|enfoque|focus)\b/.test(norm);

  if (isEvent) {
    const body = raw.replace(/^(nuevo\s+evento|evento?|e)\s+/i, "").trim();
    const parsedDates = es.parse(body, new Date(), { forwardDate: true });
    const first = parsedDates[0];
    const due = first?.start.date();
    const title = first ? stripDate(body, first.text) : body;
    const type = detectType(body);
    const subjectId = detectSubject(body, ctx);

    commands.push({
      kind: "new-event",
      label: title ? `Crear "${title}"` : "Crear evento",
      hint: due
        ? `${type} · ${due.toLocaleString("es-CO", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}`
        : "Sin fecha detectada · te llevo al calendario",
      execute: () => {
        const params = new URLSearchParams();
        if (title) params.set("title", title);
        if (due) params.set("due", due.toISOString());
        params.set("type", type);
        if (subjectId) params.set("subject", subjectId);
        return {
          href: `/calendario?draft=1&${params.toString()}`,
        };
      },
    });
  }

  if (isStudy) {
    commands.push({
      kind: "new-study",
      label: "Empezar Pomodoro",
      hint: "Ir a /estudio y arrancar timer",
      execute: () => ({ href: "/estudio?start=1" }),
    });
  }

  if (isImport) {
    commands.push({
      kind: "import-schedule",
      label: "Importar horario",
      hint: "Sube el PDF oficial",
      execute: () => ({ href: "/onboarding/schedule-import" }),
    });
  }

  if (isFocus) {
    commands.push({
      kind: "focus-dashboard",
      label: "Activar modo enfoque",
      hint: "Widget grande según hora",
      execute: () => ({
        customEvent: "acadia:toggle-focus",
        detail: {},
        href: "/dashboard",
      }),
    });
  }

  if (commands.length === 0) {
    commands.push({
      kind: "search-docs",
      label: `Buscar "${raw}" en contenido de PDFs`,
      hint: "Full-text de documentos",
      execute: () => ({
        href: `/biblioteca?q=${encodeURIComponent(raw)}`,
      }),
    });
  }

  return commands;
}
