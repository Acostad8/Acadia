import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const semester = searchParams.get("semester") || null;
  const subject = searchParams.get("subject") || null;
  if (q.length < 3) {
    return NextResponse.json({ results: [] });
  }

  const { data, error } = await supabase.rpc("search_documents", {
    q,
    semester,
    subject,
    match_limit: 30,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ results: data ?? [] });
}
