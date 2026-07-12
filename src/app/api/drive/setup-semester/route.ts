import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ensureFolder,
  getDriveClient,
  SUBJECT_SUBFOLDERS,
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

  const { semesterId } = await request.json();
  if (!semesterId) {
    return NextResponse.json({ error: "semesterId requerido" }, { status: 400 });
  }

  const { data: semester } = await supabase
    .from("semesters")
    .select()
    .eq("id", semesterId)
    .single();
  if (!semester) {
    return NextResponse.json({ error: "Semestre no encontrado" }, { status: 404 });
  }

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, drive_folder_id")
    .eq("semester_id", semesterId);

  try {
    const drive = getDriveClient(refreshToken);

    const { data: profile } = await supabase
      .from("profiles")
      .select("drive_root_folder_id")
      .eq("id", user.id)
      .single();

    const rootId =
      profile?.drive_root_folder_id ??
      (await ensureFolder(drive, "Universidad"));
    if (!profile?.drive_root_folder_id) {
      await supabase
        .from("profiles")
        .update({ drive_root_folder_id: rootId })
        .eq("id", user.id);
    }

    const semesterFolderId =
      semester.drive_folder_id ??
      (await ensureFolder(drive, semester.name, rootId));
    if (!semester.drive_folder_id) {
      await supabase
        .from("semesters")
        .update({ drive_folder_id: semesterFolderId })
        .eq("id", semesterId);
    }

    for (const subject of subjects ?? []) {
      if (subject.drive_folder_id) continue;
      const subjectFolderId = await ensureFolder(
        drive,
        subject.name,
        semesterFolderId
      );
      await Promise.all(
        SUBJECT_SUBFOLDERS.map((sub) =>
          ensureFolder(drive, sub, subjectFolderId)
        )
      );
      await supabase
        .from("subjects")
        .update({ drive_folder_id: subjectFolderId })
        .eq("id", subject.id);
    }

    return NextResponse.json({ ok: true, semesterFolderId });
  } catch (err) {
    console.error("Drive setup error:", err);
    return NextResponse.json(
      { error: "Error creando carpetas en Drive. Intenta de nuevo." },
      { status: 502 }
    );
  }
}
