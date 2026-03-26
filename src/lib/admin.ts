import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 403 }), session: null };
  }

  const row = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, twoFactorEnabled: true },
  });
  if (!row || row.role !== Role.ADMIN) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 403 }), session: null };
  }
  if (!row.twoFactorEnabled) {
    return {
      error: NextResponse.json(
        {
          error:
            "Activá la verificación en dos pasos en tu perfil antes de usar herramientas de administración.",
        },
        { status: 403 }
      ),
      session: null,
    };
  }

  return { error: null, session };
}
