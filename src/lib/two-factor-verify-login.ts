import { verifySync } from "otplib";
import { prisma } from "@/lib/prisma";
import { decryptTotpSecret } from "@/lib/two-factor-crypto";
import {
  isPermanentBackupCodeIndex,
  tryConsumeBackupCode,
} from "@/lib/two-factor-backup";
import { normalizeTwoFactorCodePayload } from "@/lib/two-factor-code-normalize";

const TOTP_WINDOW_SEC = 30;

export type TotpLoginResult =
  | { ok: true; usedBackupIndex: number | null }
  | { ok: false; error: string };

/**
 * Valida TOTP de 6 dígitos o un código de respaldo (hex mayúsculas).
 */
export async function verifyAdminSecondFactor(
  userId: string,
  codeRaw: string
): Promise<TotpLoginResult> {
  const code = normalizeTwoFactorCodePayload(codeRaw);
  if (!code) {
    return { ok: false, error: "Código requerido" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorEnabled: true,
      twoFactorSecret: true,
      twoFactorBackupCodes: true,
      role: true,
    },
  });

  if (!user?.twoFactorEnabled || user.role !== "ADMIN") {
    return { ok: false, error: "2FA no aplica" };
  }

  const isSixDigits = /^\d{6}$/.test(code);

  if (isSixDigits && user.twoFactorSecret) {
    const plain = decryptTotpSecret(user.twoFactorSecret);
    if (
      plain &&
      verifySync({
        secret: plain,
        token: code,
        epochTolerance: TOTP_WINDOW_SEC,
      }).valid
    ) {
      return { ok: true, usedBackupIndex: null };
    }
  }

  if (user.twoFactorBackupCodes.length > 0) {
    const hit = await tryConsumeBackupCode(code, user.twoFactorBackupCodes);
    if (hit) {
      return { ok: true, usedBackupIndex: hit.index };
    }
  }

  if (isSixDigits) {
    return { ok: false, error: "Código incorrecto" };
  }

  return { ok: false, error: "Código incorrecto o no es un código de respaldo válido" };
}

/**
 * Tras usar un código de respaldo de un solo uso, elimina su hash.
 * El **último** código del lote (el que queda al final del array) no se elimina nunca.
 */
export async function removeUsedBackupCode(
  userId: string,
  index: number
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorBackupCodes: true },
  });
  if (!user) return;
  const { twoFactorBackupCodes: codes } = user;
  if (isPermanentBackupCodeIndex(index, codes.length)) {
    return;
  }
  const next = codes.filter((_h: string, i: number) => i !== index);
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorBackupCodes: next },
  });
}
