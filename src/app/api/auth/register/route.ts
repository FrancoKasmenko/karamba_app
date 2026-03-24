import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fireAndForget, notifyWelcomeEmail } from "@/lib/email-events";
import { normalizeEmail, sanitizePlainText } from "@/lib/sanitize";

const BCRYPT_ROUNDS = 12;

const bodySchema = z.object({
  name: z.string().max(120).optional(),
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos. Revisá email y contraseña." },
        { status: 400 }
      );
    }

    const email = normalizeEmail(parsed.data.email);
    if (!email) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const name = sanitizePlainText(parsed.data.name, 120);
    const password = parsed.data.password;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese email" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: { name: name ?? null, email, hashedPassword },
    });

    fireAndForget(notifyWelcomeEmail(user.id));

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
    });
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
