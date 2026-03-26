import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { fireAndForget, notifyPasswordResetEmail } from "@/lib/email-events";

export function hashPasswordResetToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/**
 * Invalida tokens previos, crea uno válido 1 h y encola el mail (misma lógica que "Olvidé mi contraseña").
 */
export async function createPasswordResetTokenAndSendEmail(
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    return { ok: false, error: "Usuario no encontrado" };
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
    prisma.passwordResetToken.create({
      data: { tokenHash, userId, expiresAt },
    }),
  ]);

  fireAndForget(notifyPasswordResetEmail(userId, rawToken));
  return { ok: true };
}
