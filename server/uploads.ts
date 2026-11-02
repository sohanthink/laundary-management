import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const UPLOAD_ROOT = path.join(process.cwd(), "storage", "uploads");
const MAX_BYTES = 2 * 1024 * 1024;

type Folder = "products" | "customers";

const SIGNATURES: { ext: string; type: string; matches: (b: Buffer) => boolean }[] = [
  { ext: "jpg", type: "image/jpeg", matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: "png",
    type: "image/png",
    matches: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    ext: "webp",
    type: "image/webp",
    matches: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP",
  },
];

export const CONTENT_TYPES: Record<string, string> = Object.fromEntries(
  SIGNATURES.map((s) => [s.ext, s.type]),
);

export class UploadError extends Error {}

/**
 * Saves an uploaded image and returns its relative path (e.g. "products/uuid.jpg"),
 * or null when no file was chosen. The file type is checked from its bytes, not its name.
 */
export async function saveUpload(file: FormDataEntryValue | null, folder: Folder) {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_BYTES) throw new UploadError("Photo must be 2 MB or smaller.");

  const bytes = Buffer.from(await file.arrayBuffer());
  const signature = SIGNATURES.find((s) => s.matches(bytes));
  if (!signature) throw new UploadError("Photo must be a JPG, PNG or WebP image.");

  const relative = `${folder}/${randomUUID()}.${signature.ext}`;
  await mkdir(path.join(UPLOAD_ROOT, folder), { recursive: true });
  await writeFile(path.join(UPLOAD_ROOT, relative), bytes);
  return relative;
}

/** Reads a stored upload. Returns null for anything outside the uploads folder. */
export async function readUpload(segments: string[]) {
  if (segments.length !== 2 || !segments.every((s) => /^[\w-]+(\.\w+)?$/.test(s))) {
    return null;
  }
  const ext = segments[1].split(".").pop() ?? "";
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) return null;
  try {
    const data = await readFile(path.join(UPLOAD_ROOT, ...segments));
    return { data, contentType };
  } catch {
    return null;
  }
}