import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const schema = z.object({ semesterId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "semesterId inválido" }, { status: 422 });
  }

  const { semesterId } = parsed.data;

  const { data: semester } = await supabase
    .from("semesters")
    .select("id, drive_folder_id")
    .eq("id", semesterId)
    .maybeSingle();
  if (!semester) {
    return NextResponse.json({ error: "Semestre no existe" }, { status: 404 });
  }
  if (semester.drive_folder_id) {
    return NextResponse.json(
      { error: "El semestre ya tiene carpetas en Drive, no se puede revertir" },
      { status: 409 }
    );
  }

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id")
    .eq("semester_id", semesterId);
  const subjectIds = (subjects ?? []).map((s) => s.id);

  if (subjectIds.length > 0) {
    await supabase.from("schedule_blocks").delete().in("subject_id", subjectIds);
    await supabase.from("subjects").delete().eq("semester_id", semesterId);
  }
  await supabase.from("semesters").delete().eq("id", semesterId);

  return NextResponse.json({ ok: true });
}
