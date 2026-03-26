import { isAllowedDigitalPath } from "@/lib/digital-product-path";
import { resolveMediaPath } from "@/lib/image-url";
import {
  DIGITAL_FILE_MAX_BYTES,
  MAX_DIGITAL_FILES_PER_PRODUCT,
} from "@/lib/digital-constants";

export type DigitalFileEntry = { fileUrl: string; fileName: string };

export { MAX_DIGITAL_FILES_PER_PRODUCT, DIGITAL_FILE_MAX_BYTES };

function parseJsonDigitalFiles(raw: unknown): DigitalFileEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: DigitalFileEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const fileUrl = typeof o.fileUrl === "string" ? o.fileUrl.trim() : "";
    if (!fileUrl) continue;
    const nameRaw = typeof o.fileName === "string" ? o.fileName.trim() : "";
    const fileName = (nameRaw || "archivo").slice(0, 200);
    out.push({ fileUrl, fileName });
  }
  return out.slice(0, MAX_DIGITAL_FILES_PER_PRODUCT);
}

/**
 * Lista canónica de archivos de un producto digital (JSON nuevo o columnas legacy fileUrl/fileName).
 */
export function normalizeProductDigitalFiles(product: {
  digitalFiles?: unknown;
  fileUrl?: string | null;
  fileName?: string | null;
}): DigitalFileEntry[] {
  const fromJson = parseJsonDigitalFiles(product.digitalFiles);
  if (fromJson.length > 0) return fromJson;
  const u = product.fileUrl?.trim();
  if (!u) return [];
  const fileName = (product.fileName?.trim() || "descarga").slice(0, 200);
  return [{ fileUrl: u, fileName }];
}

function resolvedAllowsDigitalAccess(storedUrl: string): boolean {
  const resolved = resolveMediaPath(storedUrl) || storedUrl.trim();
  return isAllowedDigitalPath(resolved);
}

/**
 * Valida lista enviada desde el admin antes de persistir (1–3 rutas permitidas).
 */
export function validateDigitalFilesForSave(
  files: unknown
): { ok: true; value: DigitalFileEntry[] } | { ok: false; error: string } {
  if (!Array.isArray(files)) {
    return { ok: false, error: "Los archivos digitales deben ser una lista" };
  }
  if (files.length === 0) {
    return {
      ok: false,
      error: "Los productos digitales requieren al menos un archivo",
    };
  }
  if (files.length > MAX_DIGITAL_FILES_PER_PRODUCT) {
    return {
      ok: false,
      error: `Máximo ${MAX_DIGITAL_FILES_PER_PRODUCT} archivos por producto`,
    };
  }
  const value: DigitalFileEntry[] = [];
  for (const item of files) {
    if (!item || typeof item !== "object") {
      return { ok: false, error: "Entrada de archivo inválida" };
    }
    const o = item as Record<string, unknown>;
    const fileUrl = typeof o.fileUrl === "string" ? o.fileUrl.trim() : "";
    if (!fileUrl) {
      return { ok: false, error: "Cada archivo debe tener una URL guardada" };
    }
    if (!resolvedAllowsDigitalAccess(fileUrl)) {
      return { ok: false, error: "Ruta de archivo digital no permitida" };
    }
    const nameRaw = typeof o.fileName === "string" ? o.fileName.trim() : "";
    value.push({
      fileUrl,
      fileName: (nameRaw || "archivo").slice(0, 200),
    });
  }
  return { ok: true, value };
}
