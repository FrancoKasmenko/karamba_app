import fs from "fs/promises";
import path from "path";

export type BrandLogoKind = "png" | "jpg";

async function readFirstLogoCandidate(
  candidates: string[]
): Promise<{ bytes: Buffer; kind: BrandLogoKind } | null> {
  for (const filePath of candidates) {
    try {
      const bytes = await fs.readFile(filePath);
      if (bytes.length < 8) continue;

      const lower = filePath.toLowerCase();
      if (lower.endsWith(".png")) {
        return { bytes, kind: "png" };
      }
      if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
        return { bytes, kind: "jpg" };
      }

      if (bytes[0] === 0x89 && bytes[1] === 0x50) {
        return { bytes, kind: "png" };
      }
      if (bytes[0] === 0xff && bytes[1] === 0xd8) {
        return { bytes, kind: "jpg" };
      }
    } catch {
      /* siguiente candidato */
    }
  }

  return null;
}

/**
 * Logo para facturas y usos generales.
 * Orden: KARAMBA_LOGO_PATH → public/brand/* → public/no-image.png
 */
export async function loadKarambaLogoBytes(): Promise<{
  bytes: Buffer;
  kind: BrandLogoKind;
} | null> {
  const publicDir = path.join(process.cwd(), "public");
  const brandDir = path.join(publicDir, "brand");
  const envPath = process.env.KARAMBA_LOGO_PATH?.trim();

  const candidates: string[] = [];
  if (envPath) candidates.push(envPath);
  candidates.push(
    path.join(brandDir, "karamba-logo.png"),
    path.join(brandDir, "karamba-logo.jpg"),
    path.join(brandDir, "logo.png"),
    path.join(brandDir, "certificate-logo.png"),
    path.join(publicDir, "no-image.png")
  );

  return readFirstLogoCandidate(candidates);
}

/**
 * Certificado de curso: prioriza `public/no-image.png` (logo Karamba en web)
 * antes que archivos sueltos en /brand, para no mostrar solo texto "KARAMBA".
 */
export async function loadCertificateLogoBytes(): Promise<{
  bytes: Buffer;
  kind: BrandLogoKind;
} | null> {
  const publicDir = path.join(process.cwd(), "public");
  const brandDir = path.join(publicDir, "brand");
  const envPath = process.env.KARAMBA_LOGO_PATH?.trim();

  const candidates: string[] = [];
  if (envPath) candidates.push(envPath);
  candidates.push(path.join(publicDir, "no-image.png"));
  candidates.push(
    path.join(brandDir, "karamba-logo.png"),
    path.join(brandDir, "karamba-logo.jpg"),
    path.join(brandDir, "logo.png"),
    path.join(brandDir, "certificate-logo.png")
  );

  return readFirstLogoCandidate(candidates);
}

/** Para HTML/Puppeteer (factura). */
export async function karambaLogoDataUrl(): Promise<string | null> {
  const loaded = await loadKarambaLogoBytes();
  if (!loaded) return null;
  const mime =
    loaded.kind === "png" ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${loaded.bytes.toString("base64")}`;
}
