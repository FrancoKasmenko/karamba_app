import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { clearInstagramFeedCache } from "@/lib/instagram-feed-cache";
import { syncInstagramManualFeedRows } from "@/lib/instagram-manual-sync";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  let settings = await prisma.siteSettings.findUnique({
    where: { id: "main" },
  });

  if (!settings) {
    settings = await prisma.siteSettings.create({ data: { id: "main" } });
  }

  return NextResponse.json({
    ...settings,
    mercadoPagoTokenConfigured: Boolean(settings.mercadoPagoAccessToken),
    mercadoPagoAccessToken: settings.mercadoPagoAccessToken
      ? "••••••••" + settings.mercadoPagoAccessToken.slice(-8)
      : null,
    paypalSecretConfigured: Boolean(settings.paypalClientSecret?.trim()),
    paypalClientSecret: settings.paypalClientSecret
      ? "••••••••" + settings.paypalClientSecret.slice(-4)
      : null,
  });
}

export async function PUT(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();

  const data: Record<string, unknown> = {};
  let instagramFeedSyncWarnings: string[] = [];

  if (body.mercadoPagoAccessToken !== undefined) {
    const raw = body.mercadoPagoAccessToken;
    if (raw === null || raw === "") {
      data.mercadoPagoAccessToken = null;
    } else if (typeof raw === "string") {
      const t = raw.trim();
      if (t.length === 0) {
        data.mercadoPagoAccessToken = null;
      } else if (!t.startsWith("••")) {
        data.mercadoPagoAccessToken = t;
      }
    }
  }
  if (body.mercadoPagoPublicKey !== undefined) {
    data.mercadoPagoPublicKey = body.mercadoPagoPublicKey || null;
  }
  if (body.mercadoPagoEnabled !== undefined) {
    data.mercadoPagoEnabled = body.mercadoPagoEnabled;
  }
  if (body.paypalClientId !== undefined) {
    data.paypalClientId =
      typeof body.paypalClientId === "string"
        ? body.paypalClientId.trim() || null
        : null;
  }
  if (body.paypalClientSecret !== undefined) {
    const raw = body.paypalClientSecret;
    if (raw === null || raw === "") {
      data.paypalClientSecret = null;
    } else if (typeof raw === "string") {
      const t = raw.trim();
      if (t.length === 0) {
        data.paypalClientSecret = null;
      } else if (!t.startsWith("••")) {
        data.paypalClientSecret = t;
      }
    }
  }
  if (body.paypalEnabled !== undefined) {
    data.paypalEnabled = Boolean(body.paypalEnabled);
  }
  if (body.paypalEnvironment !== undefined) {
    const e = String(body.paypalEnvironment).toLowerCase();
    data.paypalEnvironment = e === "live" ? "live" : "sandbox";
  }
  if (body.paypalCurrency !== undefined) {
    const c = String(body.paypalCurrency ?? "UYU")
      .trim()
      .toUpperCase()
      .slice(0, 8);
    data.paypalCurrency = c || "UYU";
  }
  if (body.contactEmail !== undefined) data.contactEmail = body.contactEmail;
  if (body.contactPhone !== undefined) data.contactPhone = body.contactPhone;
  if (body.contactAddress !== undefined) data.contactAddress = body.contactAddress;
  if (body.instagram !== undefined) data.instagram = body.instagram;
  if (body.facebook !== undefined) data.facebook = body.facebook;
  if (body.whatsapp !== undefined) data.whatsapp = body.whatsapp;
  if (body.siteName !== undefined) data.siteName = body.siteName;
  if (body.siteDescription !== undefined) data.siteDescription = body.siteDescription;
  if (body.welcomeCouponCode !== undefined) {
    const w = typeof body.welcomeCouponCode === "string" ? body.welcomeCouponCode.trim() : "";
    if (!w) {
      data.welcomeCouponCode = null;
    } else {
      const code = w.toUpperCase();
      const exists = await prisma.coupon.findUnique({
        where: { code },
        select: { id: true, active: true },
      });
      if (!exists) {
        return NextResponse.json(
          { error: `No existe un cupón con el código «${code}». Crealo primero en Admin → Cupones.` },
          { status: 400 }
        );
      }
      if (!exists.active) {
        return NextResponse.json(
          { error: "Ese cupón existe pero está inactivo. Activarlo antes de asignarlo al mail de bienvenida." },
          { status: 400 }
        );
      }
      data.welcomeCouponCode = code;
    }
  }
  if (body.instagramFeedManual !== undefined) {
    let raw: unknown = body.instagramFeedManual;
    if (typeof raw === "string") {
      const t = raw.trim();
      if (t === "" || t === "null") {
        data.instagramFeedManual = null;
        raw = undefined;
      } else {
        try {
          raw = JSON.parse(t) as unknown;
        } catch {
          return NextResponse.json(
            { error: "instagramFeedManual: JSON inválido" },
            { status: 400 }
          );
        }
      }
    }
    if (data.instagramFeedManual === undefined && raw !== undefined) {
      if (raw === null) {
        data.instagramFeedManual = null;
      } else if (!Array.isArray(raw)) {
        return NextResponse.json(
          { error: "instagramFeedManual debe ser un array JSON" },
          { status: 400 }
        );
      } else if (raw.length === 0) {
        data.instagramFeedManual = [];
      } else {
        const { rows, syncErrors } = await syncInstagramManualFeedRows(raw);
        data.instagramFeedManual = rows;
        instagramFeedSyncWarnings = syncErrors;
      }
    }
  }

  const settings = await prisma.siteSettings.upsert({
    where: { id: "main" },
    update: data,
    create: { id: "main", ...data },
  });

  clearInstagramFeedCache();

  return NextResponse.json({
    ...settings,
    mercadoPagoTokenConfigured: Boolean(settings.mercadoPagoAccessToken),
    mercadoPagoAccessToken: settings.mercadoPagoAccessToken
      ? "••••••••" + settings.mercadoPagoAccessToken.slice(-8)
      : null,
    paypalSecretConfigured: Boolean(settings.paypalClientSecret?.trim()),
    paypalClientSecret: settings.paypalClientSecret
      ? "••••••••" + settings.paypalClientSecret.slice(-4)
      : null,
    instagramFeedSyncWarnings,
  });
}
