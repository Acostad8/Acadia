import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ensureFolder,
  getDriveClient,
  moveFile,
  SUBJECT_SUBFOLDERS,
  type SubjectSubfolder,
} from "@/lib/google/drive";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  const body = await request.json();
  const documentId = body.document_id;
  const subjectId = body.subject_id;
  const docType = body.doc_type;

  if (typeof documentId !== "string" || !documentId) {
    return NextResponse.json({ error: "Documento requerido" }, { status: 400 });
  }
  if (typeof subjectId !== "string" || !subjectId) {
    return NextResponse.json({ error: "Materia requerida" }, { status: 400 });
  }
  if (
    typeof docType !== "string" ||
    !SUBJECT_SUBFOLDERS.includes(docType as SubjectSubfolder)
  ) {
    return NextResponse.json(
      { error: "Tipo de documento inválido" },
      { status: 400 }
    );
  }

  const [{ data: doc }, { data: subject }] = await Promise.all([
    supabase.from("documents").select().eq("id", documentId).maybeSingle(),
    supabase
      .from("subjects")
      .select("id, semester_id, drive_folder_id")
      .eq("id", subjectId)
      .maybeSingle(),
  ]);

  if (!doc) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }
  if (!subject) {
    return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
  }
  if (!subject.drive_folder_id) {
    return NextResponse.json(
      { error: "La materia destino no tiene carpeta en Drive." },
      { status: 409 }
    );
  }
  if (doc.subject_id === subject.id && doc.doc_type === docType) {
    return NextResponse.json(doc);
  }

  try {
    const drive = getDriveClient(refreshToken);
    const targetFolderId = await ensureFolder(
      drive,
      docType,
      subject.drive_folder_id
    );

    if (doc.drive_file_id && targetFolderId !== doc.drive_folder_id) {
      await moveFile(drive, doc.drive_file_id, doc.drive_folder_id, targetFolderId);
    }

    const { data: updated, error: updateErr } = await supabase
      .from("documents")
      .update({
        subject_id: subject.id,
        semester_id: subject.semester_id,
        doc_type: docType,
        drive_folder_id: targetFolderId,
      })
      .eq("id", doc.id)
      .select()
      .single();
    if (updateErr) throw updateErr;

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Move error:", err);
    return NextResponse.json(
      { error: "Error moviendo el archivo en Drive" },
      { status: 502 }
    );
  }
}
