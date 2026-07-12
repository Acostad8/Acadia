import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/pdf-text";
import { suggestDocType, suggestSubject, suggestSubjectFromText } from "@/lib/classify";

export const runtime = "nodejs";

const MAX_SIZE = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Archivo inválido" }, { status: 400 });
  }

  const { data: semester } = await supabase
    .from("semesters")
    .select("id")
    .eq("is_current", true)
    .maybeSingle();
  if (!semester) {
    return NextResponse.json({ error: "Sin semestre activo" }, { status: 404 });
  }

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, professor")
    .eq("semester_id", semester.id);
  if (!subjects || subjects.length === 0) {
    return NextResponse.json({ subject_id: null, doc_type: suggestDocType(file.name), confidence: null });
  }

  // 1. Nombre del archivo
  const byFilename = suggestSubject(file.name, subjects);
  let subjectId = byFilename?.id ?? null;
  let confidence: "alta" | "baja" | null = byFilename ? "alta" : null;
  let docType = suggestDocType(file.name);

  // 2. Contenido (solo PDF con capa de texto)
  if (!byFilename && file.type === "application/pdf") {
    try {
      const data = new Uint8Array(await file.arrayBuffer());
      const text = await extractPdfText(data, 3);
      if (text.length > 20) {
        const byContent = suggestSubjectFromText(text, subjects);
        if (byContent) {
          subjectId = byContent.subject.id;
          confidence = byContent.confidence;
        }
        // El contenido también puede revelar el tipo si el nombre no lo dice
        const typeFromContent = suggestDocType(text.slice(0, 2000));
        if (docType === "Apuntes" && typeFromContent !== "Apuntes") {
          docType = typeFromContent;
        }
      }
    } catch {
      // PDF escaneado o corrupto: seguimos solo con el nombre
    }
  }

  return NextResponse.json({ subject_id: subjectId, doc_type: docType, confidence });
}
