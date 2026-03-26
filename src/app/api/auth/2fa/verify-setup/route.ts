import { NextResponse } from "next/server";
import { verifySync } from "otplib";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encryptTotpSecret } from "@/lib/two-factor-crypto";
import {
  generateBackupCodes,
  hashBackupCodes,
} from "@/lib/two-factor-backup";
import { checkTotpRateLimit } from "@/lib/totp-rate-limit";

const TOTP_WINDOW_SEC = 30;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, twoFactorEnabled: true },
  });
  if (!account || account.role !== Role.ADMIN) {
    return NextResponse.json(
      { error: "Solo las cuentas administradoras pueden activar 2FA" },
      { status: 403 }
    );
  }
  if (account.twoFactorEnabled) {
    return NextResponse.json(
      { error: "El 2FA ya está activado" },
      { status: 400 }
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (!checkTotpRateLimit(`2fa-setup:${session.user.id}:${ip}`)) {
    console.warn("[2fa/verify-setup] rate limit", session.user.id);
    return NextResponse.json(
      { error: "Demasiados intentos. Esperá un minuto." },
      { status: 429 }
    );
  }

  const body = (await req.json()) as { secret?: string; token?: string };
  const secret = (body.secret || "").trim();
  const token = (body.token || "").trim().replace(/\s/g, "");

  if (!secret || !/^\d{6}$/.test(token)) {
    return NextResponse.json(
      { error: "Secreto o código inválido" },
      { status: 400 }
    );
  }

  const totpOk = verifySync({
    secret,
    token,
    epochTolerance: TOTP_WINDOW_SEC,
  }).valid;

  if (!totpOk) {
    console.warn("[2fa/verify-setup] código incorrecto", session.user.id);
    return NextResponse.json({ error: "Código incorrecto" }, { status: 400 });
  }

  const plainCodes = generateBackupCodes(8);
  const hashes = await hashBackupCodes(plainCodes);
  const encrypted = encryptTotpSecret(secret);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorSecret: encrypted,
      twoFactorBackupCodes: hashes,
    },
  });

  return NextResponse.json({
    ok: true,
    backupCodes: plainCodes,
    message:
      "Guardá estos códigos de respaldo en un lugar seguro. Solo se muestran una vez.",
  });
}
