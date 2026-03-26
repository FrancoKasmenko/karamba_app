import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 16;
const AUTH_TAG_LEN = 16;

function getKey(): Buffer {
  const env = process.env.TWO_FACTOR_ENCRYPTION_KEY;
  if (env && env.length >= 16) {
    return crypto.createHash("sha256").update(env, "utf8").digest();
  }
  const secret = process.env.NEXTAUTH_SECRET || "development-unsafe";
  return crypto.scryptSync(secret, "karamba-2fa-v1", 32);
}

export function encryptTotpSecret(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv, { authTagLength: AUTH_TAG_LEN });
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptTotpSecret(stored: string): string | null {
  try {
    const buf = Buffer.from(stored, "base64");
    if (buf.length < IV_LEN + AUTH_TAG_LEN + 1) return null;
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
    const data = buf.subarray(IV_LEN + AUTH_TAG_LEN);
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGO, key, iv, {
      authTagLength: AUTH_TAG_LEN,
    });
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8"
    );
  } catch {
    return null;
  }
}
