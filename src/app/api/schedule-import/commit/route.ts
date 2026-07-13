import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const blockSchema = z.object({
  day_of_week: z.number().int().min(1).max(7),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  room_code: z.string().nullable().optional(),
  room_description: z.string().nullable().optional(),
});

const subjectSchema = z.object({
  code: z.string().nullable().optional(),
  name: z.string().min(1),
  group_name: z.string().nullable().optional(),
  credits: z
    .union([z.number().int().nonnegative(), z.string()])
    .nullable()
    .optional(),
  professor: z.string().nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  blocks: z.array(blockSchema).default([]),
});

const payloadSchema = z.object({
  semester: z.object({
    name: z.string().min(1),
    label: z.string().nullable().optional(),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    set_current: z.boolean().default(true),
  }),
  subjects: z.array(subjectSchema).min(1),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const { semester, subjects } = parsed.data;

  const { data, error } = await supabase.rpc("import_schedule", {
    p_semester: {
      name: semester.name,
      label: semester.label ?? null,
      start_date: semester.start_date ?? null,
      end_date: semester.end_date ?? null,
      set_current: semester.set_current,
    },
    p_subjects: subjects.map((s) => ({
      code: s.code ?? null,
      name: s.name,
      group_name: s.group_name ?? null,
      credits:
        typeof s.credits === "number"
          ? String(s.credits)
          : (s.credits ?? null),
      professor: s.professor ?? null,
      color: s.color,
      blocks: s.blocks.map((b) => ({
        day_of_week: b.day_of_week,
        start_time: b.start_time.length === 5 ? `${b.start_time}:00` : b.start_time,
        end_time: b.end_time.length === 5 ? `${b.end_time}:00` : b.end_time,
        room_code: b.room_code ?? null,
        room_description: b.room_description ?? null,
      })),
    })),
  });

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Error al guardar el semestre" },
      { status: 500 }
    );
  }

  return NextResponse.json({ semesterId: data as string });
}
