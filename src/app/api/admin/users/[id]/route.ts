import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { normalizeEmail, sanitizePlainText } from "@/lib/sanitize";
import { fireAndForget, notifyPasswordChangedEmail } from "@/lib/email-events";

const BCRYPT_ROUNDS = 12;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { orders: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PUT(req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, email: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const body = await req.json() as {
    name?: string | null;
    email?: string;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    role?: string;
    newPassword?: string;
  };

  const data: {
    name?: string | null;
    email?: string;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    role?: Role;
    hashedPassword?: string;
  } = {};

  if (body.name !== undefined) {
    const n = sanitizePlainText(body.name, 120);
    data.name = n ?? null;
  }

  if (body.email !== undefined) {
    const email = normalizeEmail(body.email);
    if (!email) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }
    if (email !== existing.email) {
      const taken = await prisma.user.findFirst({
        where: { email, NOT: { id } },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json(
          { error: "Ya existe otra cuenta con ese email" },
          { status: 409 }
        );
      }
    }
    data.email = email;
  }

  if (body.phone !== undefined) {
    const p = sanitizePlainText(body.phone, 40);
    data.phone = p ?? null;
  }
  if (body.address !== undefined) {
    const a = sanitizePlainText(body.address, 500);
    data.address = a ?? null;
  }
  if (body.city !== undefined) {
    const c = sanitizePlainText(body.city, 120);
    data.city = c ?? null;
  }

  if (body.role !== undefined) {
    if (body.role !== "USER" && body.role !== "ADMIN") {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }
    const nextRole = body.role as Role;
    if (nextRole === Role.ADMIN && existing.role !== Role.ADMIN) {
      return NextResponse.json(
        {
          error:
            "Para otorgar administrador usá «Promover administrador» con tu código 2FA (si tenés 2FA activo).",
        },
        { status: 400 }
      );
    }
    if (nextRole === Role.USER && existing.role === Role.ADMIN) {
      const otherAdmins = await prisma.user.count({
        where: { role: Role.ADMIN, NOT: { id } },
      });
      if (otherAdmins < 1) {
        return NextResponse.json(
          { error: "Tiene que quedar al menos un administrador en el sitio" },
          { status: 400 }
        );
      }
    }
    data.role = nextRole;
  }

  if (body.newPassword !== undefined && body.newPassword !== "") {
    if (typeof body.newPassword !== "string" || body.newPassword.length < 8) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }
    if (body.newPassword.length > 128) {
      return NextResponse.json(
        { error: "Contraseña demasiado larga" },
        { status: 400 }
      );
    }
    data.hashedPassword = await bcrypt.hash(body.newPassword, BCRYPT_ROUNDS);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { orders: true } },
      },
    });
    if (data.hashedPassword) {
      fireAndForget(notifyPasswordChangedEmail(id));
    }
    return NextResponse.json(user);
  } catch (e) {
    console.error("[admin user PUT]", e);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
