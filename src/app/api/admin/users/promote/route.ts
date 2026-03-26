import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import {
  verifyAdminSecondFactor,
  removeUsedBackupCode,
} from "@/lib/two-factor-verify-login";

export async function POST(req: Request) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  if (session.user.twoFAVerified === false) {
    return NextResponse.json(
      { error: "Completá la verificación en dos pasos para continuar" },
      { status: 403 }
    );
  }

  const body = (await req.json()) as { userId?: string; totpCode?: string };
  const targetId = (body.userId || "").trim();
  const totpCode = (body.totpCode || "").trim();

  if (!targetId) {
    return NextResponse.json({ error: "userId requerido" }, { status: 400 });
  }

  if (targetId === session.user.id) {
    return NextResponse.json({ error: "No podés promover tu propia cuenta así" }, { status: 400 });
  }

  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, twoFactorEnabled: true, role: true },
  });

  if (!actor || actor.role !== Role.ADMIN) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (actor.twoFactorEnabled) {
    if (!totpCode) {
      return NextResponse.json(
        { error: "Código 2FA requerido para promover usuarios" },
        { status: 400 }
      );
    }
    const v = await verifyAdminSecondFactor(actor.id, totpCode);
    if (!v.ok) {
      console.warn("[admin/promote] TOTP inválido", actor.id);
      return NextResponse.json({ error: v.error }, { status: 400 });
    }
    if (v.usedBackupIndex != null) {
      await removeUsedBackupCode(actor.id, v.usedBackupIndex);
    }
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true },
  });

  if (!target) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (target.role === Role.ADMIN) {
    return NextResponse.json({ error: "Ese usuario ya es administrador" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: targetId },
    data: { role: Role.ADMIN },
  });

  return NextResponse.json({ ok: true });
}
