import { NextResponse } from "next/server";
import { generateSecret, generateURI } from "otplib";
import QRCode from "qrcode";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, twoFactorEnabled: true },
  });
  if (!account || account.role !== Role.ADMIN) {
    return NextResponse.json(
      { error: "Solo las cuentas administradoras pueden configurar 2FA" },
      { status: 403 }
    );
  }
  if (account.twoFactorEnabled) {
    return NextResponse.json(
      { error: "El 2FA ya está activado en esta cuenta" },
      { status: 400 }
    );
  }

  const secret = generateSecret();
  const otpauthUrl = generateURI({
    issuer: "Karamba",
    label: session.user.email || "user",
    secret,
  });

  let qrBase64: string;
  try {
    qrBase64 = await QRCode.toDataURL(otpauthUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 220,
    });
  } catch (e) {
    console.error("[2fa/setup] QR error:", e);
    return NextResponse.json({ error: "Error al generar QR" }, { status: 500 });
  }

  return NextResponse.json({
    secret,
    otpauthUrl,
    qrBase64,
  });
}
