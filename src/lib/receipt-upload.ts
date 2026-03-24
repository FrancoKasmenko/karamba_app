import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export function validateReceiptMime(type: string): boolean {
  return ALLOWED.has(type);
}

export async function saveTransferReceipt(
  orderId: string,
  buffer: Buffer,
  mime: string
): Promise<string> {
  if (buffer.length > MAX_BYTES) {
    throw new Error("El archivo supera 5 MB");
  }
  if (!validateReceiptMime(mime)) {
    throw new Error("Formato no permitido (solo imagen o PDF)");
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    const resourceType = mime === "application/pdf" ? "raw" : "image";
    const folder = "karamba/transfer-receipts";
    const base64 = buffer.toString("base64");
    const dataUri = `data:${mime};base64,${base64}`;
    const uploaded = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: resourceType,
      public_id: `${orderId}-${Date.now()}`,
      use_filename: false,
    });
    return uploaded.secure_url;
  }

  const ext =
    mime === "application/pdf"
      ? ".pdf"
      : mime === "image/png"
        ? ".png"
        : mime === "image/webp"
          ? ".webp"
          : mime === "image/gif"
            ? ".gif"
            : ".jpg";

  const dir = path.join(process.cwd(), "public", "uploads", "transfer-receipts");
  await mkdir(dir, { recursive: true });
  const filename = `${orderId}-${Date.now()}${ext}`;
  const full = path.join(dir, filename);
  await writeFile(full, buffer);
  return `/api/uploads/transfer-receipts/${filename}`;
}
