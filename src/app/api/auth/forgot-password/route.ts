import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/sanitize";
import { createPasswordResetTokenAndSendEmail } from "@/lib/password-reset-token";
import { checkForgotPasswordRateLimit } from "@/lib/forgot-password-rate-limit";

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
      console.warn("[forgot-password] rate limit IP:", ip);
      return NextResponse.json(generic);
    }
    if (!checkForgotPasswordRateLimit(`email:${email}`)) {
      console.warn("[forgot-password] rate limit email:", email);
      return NextResponse.json(generic);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json(generic);
    }

    await createPasswordResetTokenAndSendEmail(user.id);

    return NextResponse.json(generic);
  } catch (e) {
    console.error("[forgot-password]", e);
    return NextResponse.json(generic);
  }
}
