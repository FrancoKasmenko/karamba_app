import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  completeCartOnPurchaseEvent,
  upsertActiveCartFromTotal,
} from "@/lib/analytics-cart-server";

const TRACK_TYPES = z.enum([
  "page_view",
  "view_item",
  "add_to_cart",
  "begin_checkout",
  "purchase",
]);

const bodySchema = z.object({
  type: TRACK_TYPES,
  sessionId: z.string().uuid(),
  productId: z.string().min(15).max(36).optional(),
  metadata: z.record(z.unknown()).optional().default({}),
});

const MAX_METADATA_JSON = 12_000;

function metadataSize(meta: unknown): number {
  try {
    return JSON.stringify(meta ?? {}).length;
  } catch {
    return MAX_METADATA_JSON + 1;
  }
}

function numFromMeta(
  metadata: Record<string, unknown>,
  key: string
): number | undefined {
  const v = metadata[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { type, sessionId, productId, metadata } = parsed.data;
    if (metadataSize(metadata) > MAX_METADATA_JSON) {
      return NextResponse.json(
        { error: "metadata demasiado grande" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;

    if (productId) {
      const exists = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true },
      });
      if (!exists) {
        return NextResponse.json(
          { error: "productId no encontrado" },
          { status: 400 }
        );
      }
    }

    await prisma.analyticsEvent.create({
      data: {
        type,
        sessionId,
        userId,
        productId: productId ?? null,
        metadata: metadata as object,
      },
    });

    if (type === "add_to_cart" || type === "begin_checkout") {
      const total = numFromMeta(metadata, "cartTotal") ?? 0;
      await upsertActiveCartFromTotal({ sessionId, userId, total });
    }

    if (type === "purchase") {
      const orderId =
        typeof metadata.orderId === "string" && metadata.orderId.length > 0
          ? metadata.orderId
          : undefined;
      if (orderId) {
        await completeCartOnPurchaseEvent({
          sessionId,
          userId,
          orderId,
          value: numFromMeta(metadata, "value"),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[analytics/track]", e);
    return NextResponse.json(
      { error: "No se pudo registrar el evento" },
      { status: 500 }
    );
  }
}
