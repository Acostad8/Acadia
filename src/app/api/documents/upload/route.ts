import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ensureFolder,
  getDriveClient,
  uploadFile,
  SUBJECT_SUBFOLDERS,
  type SubjectSubfolder,
} from "@/lib/google/drive";
import { extractPdfText } from "@/lib/pdf-text";

const MAX_INDEX_CHARS = 20_000;

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_SIZE = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const refreshToken = user.user_metadata?.google_provider_refresh_token;
  if (!refreshToken) {
    return NextResponse.json(
      { error: "Sin acceso a Drive. Cierra sesión y vuelve a entrar con Google." },
      { status: 400 }
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const subjectId = form.get("subject_id");
  const docType = form.get("doc_type");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Archivo supera 25 MB" }, { status: 400 });
  }
  if (typeof subjectId !== "string" || !subjectId) {
    return NextResponse.json({ error: "Materia requerida" }, { status: 400 });
  }
  if (
    typeof docType !== "string" ||
    !SUBJECT_SUBFOLDERS.includes(docType as SubjectSubfolder)
  ) {
    return NextResponse.json({ error: "Tipo de documento inválido" }, { status: 400 });
  }

  const { data: subject } = await supabase
    .from("subjects")
    .select("id, semester_id, drive_folder_id")
    .eq("id", subjectId)
    .single();
  if (!subject) {
    return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
  }
  if (!subject.drive_folder_id) {
    return NextResponse.json(
      { error: "La materia no tiene carpeta en Drive. Crea las carpetas desde el dashboard." },
      { status: 409 }
    );
  }

  try {
    const drive = getDriveClient(refreshToken);
    const typeFolderId = await ensureFolder(
      drive,
      docType,
      subject.drive_folder_id
    );
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadFile(drive, typeFolderId, {
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer,
    });

    let contentText: string | null = null;
    if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
      try {
        const raw = await extractPdfText(new Uint8Array(buffer), 10);
        const cleaned = raw.replace(/\s+/g, " ").trim();
        if (cleaned) contentText = cleaned.slice(0, MAX_INDEX_CHARS);
      } catch (err) {
        console.warn("PDF text extraction failed:", err);
      }
    }

    const { data: doc, error: insertErr } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        subject_id: subject.id,
        semester_id: subject.semester_id,
        name: file.name,
        doc_type: docType,
        drive_file_id: uploaded.id,
        drive_folder_id: typeFolderId,
        drive_web_link: uploaded.webViewLink,
        mime_type: file.type || null,
        size_bytes: file.size,
        content_text: contentText,
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    return NextResponse.json(doc);
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Error subiendo el archivo a Drive" },
      { status: 502 }
    );
  }
}
