import { NextRequest, NextResponse } from "next/server";
import { getToken, encode } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { checkTotpRateLimit } from "@/lib/totp-rate-limit";
import {
  verifyAdminSecondFactor,
  removeUsedBackupCode,
} from "@/lib/two-factor-verify-login";

const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;

export async function POST(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Configuración incompleta" }, { status: 500 });
  }

  const token = await getToken({ req, secret });
  if (!token?.sub || !token.twoFAPending) {
    return NextResponse.json(
      { error: "Sesión inválida. Iniciá sesión de nuevo." },
      { status: 401 }
    );
  }

  const userId = token.sub as string;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (!checkTotpRateLimit(`2fa-login:${userId}:${ip}`)) {
    console.warn("[2fa/login] rate limit", userId, ip);
    return NextResponse.json(
      { error: "Demasiados intentos. Esperá un minuto." },
      { status: 429 }
    );
  }

  const body = (await req.json()) as { code?: string };
  const code = (body.code || "").trim();
  if (!code) {
    return NextResponse.json({ error: "Código requerido" }, { status: 400 });
  }

  const result = await verifyAdminSecondFactor(userId, code);
  if (!result.ok) {
    console.warn("[2fa/login] fallo verificación", userId, result.error);
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (result.usedBackupIndex != null) {
    await removeUsedBackupCode(userId, result.usedBackupIndex);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, twoFactorEnabled: true },
  });
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Usuario inválido" }, { status: 400 });
  }

  const t = token as JWT & { iat?: number; exp?: number; jti?: string };
  const { iat: _i, exp: _e, jti: _j, ...rest } = t;
  const { pendingRole: _p, ...restNoPending } = rest as JWT & {
    pendingRole?: string;
  };
  const newToken: JWT = {
    ...restNoPending,
    name: user.name,
    email: user.email,
    sub: user.id,
    id: user.id,
    role: user.role,
    twoFAPending: false,
    twoFAVerified: true,
  };

  const jwt = await encode({
    token: newToken,
    secret,
    maxAge: SESSION_MAX_AGE_SEC,
  });

  const cookieName =
    authOptions.cookies?.sessionToken?.name ?? "next-auth.session-token";
  const cookieOpts = authOptions.cookies?.sessionToken?.options ?? {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: false,
  };

  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName, jwt, cookieOpts);
  return res;
}
