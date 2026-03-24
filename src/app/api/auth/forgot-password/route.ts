import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/sanitize";
import { fireAndForget, notifyPasswordResetRequest } from "@/lib/email-events";
import { getBaseUrl } from "@/lib/base-url";
import { checkForgotPasswordRateLimit } from "@/lib/forgot-password-rate-limit";
import { isEmailConfigured } from "@/lib/email-transport";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export async function POST(req: Request) {
  const generic = {
    ok: true,
    message:
      "Si ese email está registrado, te enviamos un enlace para restablecer la contraseña.",
  };

  try {
    const body = (await req.json()) as { email?: string };
    const email = normalizeEmail(body.email);
    if (!email) {
      return NextResponse.json(generic);
    }

    const forwarded = req.headers.get("x-forwarded-for");
    const ip =
      (forwarded ? forwarded.split(",")[0]?.trim() : null) ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (!checkForgotPasswordRateLimit(`ip:${ip}`)) {
      return NextResponse.json(generic);
    }
    if (!checkForgotPasswordRateLimit(`email:${email}`)) {
      return NextResponse.json(generic);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json(generic);
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.create({
        data: { tokenHash, userId: user.id, expiresAt },
      }),
    ]);

    if (isEmailConfigured()) {
      const resetUrl = `${getBaseUrl()}/login/restablecer-contrasena?token=${encodeURIComponent(rawToken)}`;
      fireAndForget(
        notifyPasswordResetRequest(user.email, user.name, resetUrl)
      );
    } else {
      console.warn(
        "[forgot-password] Email no configurado — token creado pero sin envío"
      );
    }

    return NextResponse.json(generic);
  } catch {
    return NextResponse.json(generic);
  }
}
