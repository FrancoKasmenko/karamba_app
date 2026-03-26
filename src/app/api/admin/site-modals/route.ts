import { NextResponse } from "next/server";
import { SiteModalFrequency, SiteModalLayout } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

function parseFrequency(v: unknown): SiteModalFrequency {
  if (v === "EVERY_SESSION") return SiteModalFrequency.EVERY_SESSION;
  if (v === "AGAIN_AFTER_DAYS") return SiteModalFrequency.AGAIN_AFTER_DAYS;
  return SiteModalFrequency.ONCE_PER_BROWSER;
}

function parseLayout(v: unknown): SiteModalLayout {
  return v === "IMAGE_TEXT" ? SiteModalLayout.IMAGE_TEXT : SiteModalLayout.TEXT_LOGO;
}

/** Texto opcional: vacío, "null" o "undefined" → null en BD */
function optText(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  if (!t) return null;
  const low = t.toLowerCase();
  if (low === "null" || low === "undefined") return null;
  return t;
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const modals = await prisma.siteModal.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(modals);
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }

    const count = await prisma.siteModal.count();
    const modal = await prisma.siteModal.create({
      data: {
        name,
        active: body.active !== false,
        frequency: parseFrequency(body.frequency),
        showAgainAfterDays:
          parseFrequency(body.frequency) === SiteModalFrequency.AGAIN_AFTER_DAYS
            ? Math.max(1, Math.min(365, Math.floor(Number(body.showAgainAfterDays) || 7)))
            : null,
        layout: parseLayout(body.layout),
        title: optText(body.title),
        body: optText(body.body),
        imageUrl: optText(body.imageUrl),
        ctaLabel: optText(body.ctaLabel),
        ctaHref: optText(body.ctaHref),
        dismissLabel: String(body.dismissLabel || "Cerrar").trim() || "Cerrar",
        sortOrder: body.sortOrder ?? count,
      },
    });
    return NextResponse.json(modal);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al crear modal" }, { status: 500 });
  }
}
