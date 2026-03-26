import { NextResponse } from "next/server";
import { SiteModalFrequency, SiteModalLayout } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseFrequency(v: unknown): SiteModalFrequency {
  if (v === "EVERY_SESSION") return SiteModalFrequency.EVERY_SESSION;
  if (v === "AGAIN_AFTER_DAYS") return SiteModalFrequency.AGAIN_AFTER_DAYS;
  return SiteModalFrequency.ONCE_PER_BROWSER;
}

function parseLayout(v: unknown): SiteModalLayout {
  return v === "IMAGE_TEXT" ? SiteModalLayout.IMAGE_TEXT : SiteModalLayout.TEXT_LOGO;
}

function optText(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  if (!t) return null;
  const low = t.toLowerCase();
  if (low === "null" || low === "undefined") return null;
  return t;
}

export async function PUT(req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;
  const body = await req.json();

  const existing = await prisma.siteModal.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const name = String(body.name ?? existing.name).trim();
  if (!name) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }

  const frequency = parseFrequency(body.frequency ?? existing.frequency);

  try {
    const modal = await prisma.siteModal.update({
      where: { id },
      data: {
        name,
        active:
          body.active !== undefined ? Boolean(body.active) : existing.active,
        frequency,
        showAgainAfterDays:
          frequency === SiteModalFrequency.AGAIN_AFTER_DAYS
            ? Math.max(
                1,
                Math.min(
                  365,
                  Math.floor(
                    Number(
                      body.showAgainAfterDays ?? existing.showAgainAfterDays ?? 7
                    ) || 7
                  )
                )
              )
            : null,
        layout: parseLayout(body.layout ?? existing.layout),
        title:
          body.title !== undefined ? optText(body.title) : existing.title,
        body: body.body !== undefined ? optText(body.body) : existing.body,
        imageUrl:
          body.imageUrl !== undefined
            ? optText(body.imageUrl)
            : existing.imageUrl,
        ctaLabel:
          body.ctaLabel !== undefined
            ? optText(body.ctaLabel)
            : existing.ctaLabel,
        ctaHref:
          body.ctaHref !== undefined ? optText(body.ctaHref) : existing.ctaHref,
        dismissLabel:
          body.dismissLabel !== undefined
            ? String(body.dismissLabel).trim() || "Cerrar"
            : existing.dismissLabel,
        sortOrder:
          body.sortOrder !== undefined
            ? Math.floor(Number(body.sortOrder)) || 0
            : existing.sortOrder,
      },
    });
    return NextResponse.json(modal);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;
  await prisma.siteModal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
