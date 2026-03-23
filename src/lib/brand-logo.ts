import fs from "fs/promises";
import path from "path";

export type BrandLogoKind = "png" | "jpg";

/**
 * Logo para PDFs y facturas.
 * Orden: KARAMBA_LOGO_PATH → public/brand/karamba-logo.png|.jpg → logo.png → certificate-logo.png
 */
export async function loadKarambaLogoBytes(): Promise<{
  bytes: Buffer;
  kind: BrandLogoKind;
} | null> {
  const brandDir = path.join(process.cwd(), "public", "brand");
  const envPath = process.env.KARAMBA_LOGO_PATH?.trim();

  const candidates: string[] = [];
  if (envPath) candidates.push(envPath);
  candidates.push(
    path.join(brandDir, "karamba-logo.png"),
    path.join(brandDir, "karamba-logo.jpg"),
    path.join(brandDir, "logo.png"),
    path.join(brandDir, "certificate-logo.png")
  );

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

/** Para HTML/Puppeteer (factura). */
export async function karambaLogoDataUrl(): Promise<string | null> {
  const loaded = await loadKarambaLogoBytes();
  if (!loaded) return null;
  const mime =
    loaded.kind === "png" ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${loaded.bytes.toString("base64")}`;
}
