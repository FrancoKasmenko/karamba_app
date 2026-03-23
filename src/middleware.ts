import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ req, token }) {
        const pathname = req.nextUrl.pathname;
        if (
          pathname.startsWith("/curso/") &&
          !pathname.includes("/contenido")
        ) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/perfil/:path*",
    "/checkout/:path*",
    "/mi-aprendizaje",
    "/mi-aprendizaje/:path*",
    "/curso/:path*",
  ],
};
