import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { WIDGET_IDS, normalizeLayout } from "@/lib/widgets";

export const runtime = "nodejs";

const schema = z
  .object({
    dashboard_layout: z.array(z.enum(WIDGET_IDS)).optional(),
    focus_mode: z.boolean().optional(),
    silent_hours_start: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
    silent_hours_end: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  })
  .strict();

export async function PUT(request: NextRequest) {
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
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const patch = parsed.data;
  const values: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() };
  if (patch.dashboard_layout) {
    values.dashboard_layout = normalizeLayout(patch.dashboard_layout);
  }
  if (typeof patch.focus_mode === "boolean") values.focus_mode = patch.focus_mode;
  if (patch.silent_hours_start) values.silent_hours_start = patch.silent_hours_start;
  if (patch.silent_hours_end) values.silent_hours_end = patch.silent_hours_end;

  const { error } = await supabase
    .from("user_preferences")
    .upsert(values, { onConflict: "user_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
