import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { summarizeGrades } from "@/lib/grades";
import type {
  CalendarEvent,
  Evaluation,
  ScheduleBlock,
  Subject,
} from "@/lib/types";

export const maxDuration = 60;

const SYSTEM_INSTRUCTIONS = `Eres Acadia, el asistente académico personal de un estudiante universitario colombiano (UFPSO).

Reglas:
- Responde siempre en español, de forma concisa y práctica.
- La escala de notas es 0.0 a 5.0; se aprueba con 3.0.
- Usa los datos del contexto (materias, notas, evaluaciones, horario, entregas) para dar respuestas específicas: cuánto necesita en lo que falta, qué materias están en riesgo, qué entregas se acercan.
- Si te preguntan algo fuera del ámbito académico del estudiante, responde brevemente y reconduce hacia sus estudios.
- No inventes datos que no estén en el contexto. Si falta información, dilo.
- Formato: usa listas cortas cuando ayuden; evita párrafos largos.`;

const DAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

type ChatMessage = { role: "user" | "assistant"; content: string };

async function buildContext(): Promise<string | null> {
  const supabase = await createClient();
  const { data: semester } = await supabase
    .from("semesters")
    .select()
    .eq("is_current", true)
    .maybeSingle();
  if (!semester) return null;

  const [{ data: subjects }, { data: events }] = await Promise.all([
    supabase.from("subjects").select().eq("semester_id", semester.id),
    supabase
      .from("events")
      .select()
      .eq("semester_id", semester.id)
      .eq("completed", false)
      .order("due_at")
      .limit(15),
  ]);

  const subjectIds = ((subjects ?? []) as Subject[]).map((s) => s.id);
  const [{ data: evaluations }, { data: blocks }] = subjectIds.length
    ? await Promise.all([
        supabase.from("evaluations").select().in("subject_id", subjectIds),
        supabase.from("schedule_blocks").select().in("subject_id", subjectIds),
      ])
    : [{ data: [] }, { data: [] }];

  const lines: string[] = [
    `Semestre actual: ${semester.label ?? semester.name}`,
    "",
    "MATERIAS:",
  ];

  for (const s of (subjects ?? []) as Subject[]) {
    const evals = ((evaluations ?? []) as Evaluation[]).filter(
      (e) => e.subject_id === s.id
    );
    const summary = summarizeGrades(evals);
    lines.push(
      `- ${s.name}${s.credits ? ` (${s.credits} créditos)` : ""}${s.professor ? `, profesor: ${s.professor}` : ""}`
    );
    const sBlocks = ((blocks ?? []) as ScheduleBlock[]).filter(
      (b) => b.subject_id === s.id
    );
    if (sBlocks.length) {
      lines.push(
        `  Horario: ${sBlocks
          .map(
            (b) =>
              `${DAY_NAMES[b.day_of_week]} ${b.start_time.slice(0, 5)}-${b.end_time.slice(0, 5)}`
          )
          .join(", ")}`
      );
    }
    if (evals.length) {
      lines.push(
        `  Evaluaciones: ${evals
          .map(
            (e) =>
              `${e.name} (${e.weight_percent}%): ${e.grade === null ? "sin nota" : e.grade}`
          )
          .join("; ")}`
      );
      lines.push(
        `  Acumulado: ${summary.accumulated.toFixed(2)} · ${summary.evaluatedPercent}% evaluado · máxima alcanzable ${summary.maxAchievable.toFixed(2)} · estado: ${summary.status}`
      );
    } else {
      lines.push("  Sin evaluaciones registradas.");
    }
  }

  const pending = (events ?? []) as CalendarEvent[];
  lines.push("", "ENTREGAS PENDIENTES:");
  if (pending.length === 0) {
    lines.push("- Ninguna registrada.");
  } else {
    const subjectById = new Map(
      ((subjects ?? []) as Subject[]).map((s) => [s.id, s.name])
    );
    for (const ev of pending) {
      lines.push(
        `- ${ev.title} (${ev.type}${ev.subject_id ? `, ${subjectById.get(ev.subject_id)}` : ""}): vence ${new Date(ev.due_at).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}`
      );
    }
  }

  return lines.join("\n");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const messages = (body.messages ?? []) as ChatMessage[];
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.some(
      (m) =>
        (m.role !== "user" && m.role !== "assistant") ||
        typeof m.content !== "string"
    )
  ) {
    return Response.json({ error: "Mensajes inválidos" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      {
        error:
          "Falta ANTHROPIC_API_KEY en .env.local. Agrega tu clave de la API de Anthropic para activar el asistente.",
      },
      { status: 503 }
    );
  }

  const context = await buildContext();
  if (!context) {
    return Response.json(
      { error: "Configura un semestre primero" },
      { status: 400 }
    );
  }

  const anthropic = new Anthropic();

  const stream = anthropic.messages.stream({
    model: "claude-opus-4-7",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: [
      { type: "text", text: SYSTEM_INSTRUCTIONS },
      {
        type: "text",
        text: `Contexto académico del estudiante:\n\n${context}`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: messages.slice(-20),
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    start(controller) {
      stream.on("text", (delta) => {
        controller.enqueue(encoder.encode(delta));
      });
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
