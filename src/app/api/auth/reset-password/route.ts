import { NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fireAndForget, notifyPasswordChangedEmail } from "@/lib/email-events";

const BCRYPT_ROUNDS = 12;

const bodySchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8).max(128),
});

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos. La contraseña debe tener al menos 8 caracteres." },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;
    const tokenHash = hashToken(token);

    const row = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true } } },
    });

    if (!row || row.usedAt || row.expiresAt < new Date()) {
      return NextResponse.json(
        {
          error:
            "El enlace no es válido o expiró. Solicitá uno nuevo desde «Olvidé mi contraseña».",
        },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: row.userId },
        data: { hashedPassword },
      });
      await tx.passwordResetToken.deleteMany({
        where: { userId: row.userId },
      });
    });

    fireAndForget(notifyPasswordChangedEmail(row.user.id));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se pudo actualizar la contraseña." },
      { status: 500 }
    );
  }
}
