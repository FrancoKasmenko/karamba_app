import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { quoteShippingFromProducts } from "@/lib/shipping-quote";

/** Cotización de envío sin sesión (solo lectura, para ficha de producto). */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const departamento = searchParams.get("departamento") || "Montevideo";
    const city = searchParams.get("city") || "";
    const delivery =
      searchParams.get("delivery") === "pickup" ? "pickup" : "shipping";

    if (!productId?.trim()) {
      return NextResponse.json(
        { error: "productId requerido" },
        { status: 400 }
      );
    }

    const exists = await prisma.product.findUnique({
      where: { id: productId.trim() },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    const quote = await quoteShippingFromProducts({
      productIds: [productId.trim()],
      delivery,
      departamento,
      city,
    });

    return NextResponse.json({
      cost: quote.cost,
      zoneName: quote.zoneName,
      pendingManualQuote: quote.pendingManualQuote,
      skipPhysicalDelivery: quote.skipPhysicalDelivery,
    });
  } catch (e) {
    console.error("[shipping/public-estimate]", e);
    return NextResponse.json(
      { error: "No se pudo estimar el envío" },
      { status: 500 }
    );
  }
}
