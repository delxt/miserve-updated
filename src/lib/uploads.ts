import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const ALLOWED: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
};

export function uploadRoot() {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.UPLOAD_DIR || "./storage/uploads");
}

/** Pulls real files out of a form field and checks count, size and type. */
export function pickFiles(form: FormData, field = "attachments"): { files: File[]; error?: string } {
  const files = form
    .getAll(field)
    .filter((v): v is File => typeof v === "object" && v !== null && "size" in v && v.size > 0);
  if (files.length > MAX_FILES) return { files: [], error: `You can attach up to ${MAX_FILES} files.` };
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) return { files: [], error: `${f.name} is larger than 10 MB.` };
    if (!ALLOWED[f.type]) return { files: [], error: `${f.name}: this file type is not allowed.` };
  }
  return { files };
}

/** Saves a file under a random name and returns the path relative to the upload root. */
export async function saveFile(ticketId: number, file: File) {
  const dir = path.join(/*turbopackIgnore: true*/ uploadRoot(), String(ticketId));
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}${ALLOWED[file.type] ?? ""}`;
  await writeFile(path.join(/*turbopackIgnore: true*/ dir, name),Buffer.from(await file.arrayBuffer()));
  return path.posix.join(String(ticketId), name);
}

export function absolutePath(storagePath: string) {
  const root = uploadRoot();
  const full = path.resolve(/*turbopackIgnore: true*/ root, storagePath);
  if (!full.startsWith(root + path.sep)) throw new Error("Bad attachment path");
  return full;
}
