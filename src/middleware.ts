import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkLoginRateLimit } from "@/lib/login-rate-limit";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (pathname === "/api/auth/callback/credentials") {
    if (req.method === "POST") {
      const xf = req.headers.get("x-forwarded-for");
      const ip =
        (xf ? xf.split(",")[0]?.trim() : null) ||
        req.headers.get("x-real-ip") ||
        "unknown";
      if (!checkLoginRateLimit(`login:${ip}`)) {
        return NextResponse.json(
          { error: "Demasiados intentos. Probá más tarde." },
          { status: 429 }
        );
      }
    }
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (pathname.startsWith("/curso/") && !pathname.includes("/contenido")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (!token) {
      const u = new URL("/login", req.url);
      u.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(u);
    }
    const twoFAPending = Boolean(
      (token as { twoFAPending?: boolean }).twoFAPending,
    );
    if (twoFAPending) {
      const u = new URL("/login/2fa", req.url);
      u.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(u);
    }
    if (token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    const u = new URL("/login", req.url);
    u.searchParams.set(
      "callbackUrl",
      `${pathname}${req.nextUrl.search}`
    );
    return NextResponse.redirect(u);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/auth/callback/credentials",
    "/admin/:path*",
    "/perfil/:path*",
    "/checkout/:path*",
    "/mi-aprendizaje",
    "/mi-aprendizaje/:path*",
    "/curso/:path*",
  ],
};
