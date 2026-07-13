import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ensureFolder,
  getDriveClient,
  SUBJECT_SUBFOLDERS,
} from "@/lib/google/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Event =
  | { type: "start"; total: number }
  | { type: "progress"; step: string; done: number; total: number; label?: string }
  | { type: "done"; semesterFolderId: string }
  | { type: "error"; message: string };

function sse(event: Event): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET(request: NextRequest) {
  const semesterId = request.nextUrl.searchParams.get("semesterId");
  if (!semesterId) {
    return new Response("semesterId requerido", { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("No autenticado", { status: 401 });

  const refreshToken = user.user_metadata?.google_provider_refresh_token as
    | string
    | undefined;
  if (!refreshToken) {
    return new Response("Sin acceso a Drive", { status: 400 });
  }

  const { data: semester } = await supabase
    .from("semesters")
    .select("id, name, drive_folder_id")
    .eq("id", semesterId)
    .maybeSingle();
  if (!semester) return new Response("Semestre no encontrado", { status: 404 });

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, drive_folder_id")
    .eq("semester_id", semesterId)
    .order("name");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: Event) => controller.enqueue(encoder.encode(sse(e)));
      const subjectCount = subjects?.length ?? 0;
      const total = 2 + subjectCount * (1 + SUBJECT_SUBFOLDERS.length);
      let done = 0;

      try {
        send({ type: "start", total });

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
        done++;
        send({ type: "progress", step: "root", done, total, label: "Universidad/" });

        const semesterFolderId =
          semester.drive_folder_id ??
          (await ensureFolder(drive, semester.name, rootId));
        if (!semester.drive_folder_id) {
          await supabase
            .from("semesters")
            .update({ drive_folder_id: semesterFolderId })
            .eq("id", semesterId);
        }
        done++;
        send({
          type: "progress",
          step: "semester",
          done,
          total,
          label: `${semester.name}/`,
        });

        for (const subject of subjects ?? []) {
          const subjectFolderId =
            subject.drive_folder_id ??
            (await ensureFolder(drive, subject.name, semesterFolderId));

          if (!subject.drive_folder_id) {
            await supabase
              .from("subjects")
              .update({ drive_folder_id: subjectFolderId })
              .eq("id", subject.id);
          }
          done++;
          send({
            type: "progress",
            step: "subject",
            done,
            total,
            label: subject.name,
          });

          for (const sub of SUBJECT_SUBFOLDERS) {
            await ensureFolder(drive, sub, subjectFolderId);
            done++;
            send({
              type: "progress",
              step: "subfolder",
              done,
              total,
              label: `${subject.name}/${sub}`,
            });
          }
        }

        send({ type: "done", semesterFolderId });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error creando carpetas en Drive";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
