import crypto from "crypto";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

export function generateBackupCodes(count = 8): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(crypto.randomBytes(5).toString("hex").toUpperCase());
  }
  return out;
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
  const code = input.trim().toUpperCase().replace(/\s+/g, "");
  if (code.length < 8) return null;
  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(code, hashes[i])) {
      return { index: i };
    }
  }
  return null;
}
