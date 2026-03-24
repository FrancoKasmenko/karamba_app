import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_BYTES = 80 * 1024 * 1024;
const API_PREFIX = "/api/uploads/digital-products";

function sanitizeOriginalName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-()\s\u00f1\u00d1]/g, "_").slice(0, 120);
}

export async function saveDigitalProductFile(
  buffer: Buffer,
  originalName: string
): Promise<{ fileUrl: string; fileName: string }> {
  if (buffer.length > MAX_BYTES) {
    throw new Error("El archivo supera 80 MB");
  }

  const safe = sanitizeOriginalName(originalName) || "archivo";
  const stored = `${randomUUID()}-${safe}`;
  const dir = path.join(process.cwd(), "public", "uploads", "digital-products");
  await mkdir(dir, { recursive: true });
  const full = path.join(dir, stored);
  await writeFile(full, buffer);
  return {
    fileUrl: `${API_PREFIX}/${stored}`,
    fileName: originalName.slice(0, 200) || safe,
  };
}

export function isAllowedDigitalPath(url: string): boolean {
  if (!url || url.includes("..")) return false;
  return url.startsWith(`${API_PREFIX}/`);
}
