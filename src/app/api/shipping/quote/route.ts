import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { quoteShippingFromProducts } from "@/lib/shipping-quote";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const productIds = body.productIds as string[] | undefined;
    const delivery = body.delivery as string | undefined;
    const departamento = String(body.departamento ?? "Montevideo");
    const city = String(body.city ?? "");

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: "productIds requerido" },
        { status: 400 }
      );
    }

    const uniqueIds = [...new Set(productIds.filter(Boolean))];
    const count = await prisma.product.count({
      where: { id: { in: uniqueIds } },
    });
    if (count !== uniqueIds.length) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 400 }
      );
    }

    const del: "shipping" | "pickup" =
      delivery === "pickup" ? "pickup" : "shipping";

    const quote = await quoteShippingFromProducts({
      productIds: uniqueIds,
      delivery: del,
      departamento,
      city,
    });

    return NextResponse.json({
      cost: quote.cost,
      zoneId: quote.zoneId,
      zoneName: quote.zoneName,
      pendingManualQuote: quote.pendingManualQuote,
      skipPhysicalDelivery: quote.skipPhysicalDelivery,
    });
  } catch (e) {
    console.error("[shipping/quote]", e);
    return NextResponse.json(
      { error: "No se pudo calcular el envío" },
      { status: 500 }
    );
  }
}
