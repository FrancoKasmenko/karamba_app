import { Buffer } from "node:buffer";

/**
 * Lee un archivo de multipart FormData como Buffer binario válido (Node / Docker).
 * Evita rutas que dejen el buffer vacío o mal interpretado.
 */
export async function readFormFileBuffer(file: unknown): Promise<{
  buffer: Buffer;
  type: string;
  name: string;
  size: number;
}> {
  if (file == null || typeof file !== "object" || !(file instanceof Blob)) {
    throw new Error("Archivo requerido o inválido");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (!buffer || buffer.length === 0) {
    throw new Error("Archivo vacío o inválido");
  }

  const type =
    typeof (file as File).type === "string" ? (file as File).type.trim() : "";
  const name =
    typeof (file as File).name === "string" ? (file as File).name : "upload";

  return {
    buffer,
    type,
    name,
    size: typeof file.size === "number" ? file.size : buffer.length,
  };
}
