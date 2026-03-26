import crypto from "crypto";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

/**
 * Genera códigos de respaldo en orden. El **último** del array es permanente:
 * sigue válido aunque lo uses muchas veces; el resto se invalida al usarlo una vez.
 */
export function generateBackupCodes(count = 8): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(crypto.randomBytes(5).toString("hex").toUpperCase());
  }
  return out;
}

/** `true` si ese índice corresponde al código permanente del lote actual (siempre el último slot). */
export function isPermanentBackupCodeIndex(index: number, total: number): boolean {
  return total > 0 && index === total - 1;
}

export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(
    codes.map((c) => bcrypt.hash(c.trim().toUpperCase(), BCRYPT_ROUNDS))
  );
}

export async function tryConsumeBackupCode(
  input: string,
  hashes: string[]
): Promise<{ index: number } | null> {
  const code = input
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .replace(/[^0-9A-Fa-f]/g, "")
    .toUpperCase();
  if (code.length < 8) return null;
  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(code, hashes[i])) {
      return { index: i };
    }
  }
  return null;
}
