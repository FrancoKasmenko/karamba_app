import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  notifyOrderCreated,
  notifyOrderPaid,
  notifyOrderRejected,
  notifyTransferReminder,
} from "@/lib/email-events";

interface RouteContext {
  params: Promise<{ id: string }>;
}

type ResendType =
  | "ORDER_CREATED"
  | "ORDER_PAID"
  | "ORDER_REJECTED"
  | "TRANSFER_REMINDER";

export async function POST(req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: orderId } = await context.params;
  const body = await req.json().catch(() => ({}));
  const type = body.type as ResendType | undefined;

  if (
    !type ||
    !["ORDER_CREATED", "ORDER_PAID", "ORDER_REJECTED", "TRANSFER_REMINDER"].includes(
      type
    )
  ) {
    return NextResponse.json({ error: "type inválido" }, { status: 400 });
  }

  try {
    switch (type) {
      case "ORDER_CREATED":
        await notifyOrderCreated(orderId, { force: true });
        break;
      case "ORDER_PAID":
        await notifyOrderPaid(orderId, "PENDING", { force: true });
        break;
      case "ORDER_REJECTED":
        await notifyOrderRejected(orderId, "PENDING", { force: true });
        break;
      case "TRANSFER_REMINDER":
        await notifyTransferReminder(orderId, { force: true });
        break;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[ADMIN RESEND EMAIL]", e);
    return NextResponse.json({ error: "Error al enviar" }, { status: 500 });
  }
}
