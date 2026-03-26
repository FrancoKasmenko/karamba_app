import path from "path";

/**
 * Resuelve URL pública guardada en BD a ruta absoluta bajo `public/uploads/`.
 * Canónico: `/api/uploads/...`. Acepta `/uploads/...` solo por filas antiguas.
 */
export function uploadPublicUrlToAbsolutePath(url: string): string | null {
  const raw = url.trim();
  if (!raw || raw.includes("..")) return null;

  const withoutLead = raw.replace(/^\/+/, "");
  let underUploads: string;

  if (withoutLead.startsWith("_k/uploads/")) {
    underUploads = withoutLead.slice("_k/".length);
  } else if (withoutLead.startsWith("api/uploads/")) {
    underUploads = withoutLead.slice("api/".length);
  } else if (withoutLead.startsWith("uploads/")) {
    underUploads = withoutLead;
  } else {
    return null;
  }

  const segments = underUploads.split("/").filter(Boolean);
  if (segments[0] !== "uploads") return null;

  const abs = path.join(process.cwd(), "public", ...segments);
  const root = path.join(process.cwd(), "public", "uploads");
  const resolved = path.resolve(abs);
  if (!resolved.startsWith(path.resolve(root) + path.sep) && resolved !== path.resolve(root)) {
    return null;
  }
  return resolved;
}
