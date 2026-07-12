import { google, type drive_v3 } from "googleapis";
import { Readable } from "node:stream";

export { SUBJECT_SUBFOLDERS, type SubjectSubfolder } from "@/lib/doc-types";

export function getDriveClient(refreshToken: string): drive_v3.Drive {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: "v3", auth });
}

function escapeQuery(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export async function ensureFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId?: string
): Promise<string> {
  const conditions = [
    `name = '${escapeQuery(name)}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
  ];
  if (parentId) conditions.push(`'${parentId}' in parents`);

  const existing = await drive.files.list({
    q: conditions.join(" and "),
    fields: "files(id)",
    spaces: "drive",
    pageSize: 1,
  });
  const found = existing.data.files?.[0]?.id;
  if (found) return found;

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentId && { parents: [parentId] }),
    },
    fields: "id",
  });
  return created.data.id!;
}

export async function uploadFile(
  drive: drive_v3.Drive,
  folderId: string,
  file: { name: string; mimeType: string; buffer: Buffer }
): Promise<{ id: string; webViewLink: string | null }> {
  const res = await drive.files.create({
    requestBody: {
      name: file.name,
      parents: [folderId],
    },
    media: {
      mimeType: file.mimeType,
      body: Readable.from(file.buffer),
    },
    fields: "id, webViewLink",
  });
  return { id: res.data.id!, webViewLink: res.data.webViewLink ?? null };
}
