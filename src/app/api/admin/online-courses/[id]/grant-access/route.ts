import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { syncOnlineCourseAccessFromOrder } from "@/lib/order-course-sync";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: onlineCourseId } = await context.params;
  const body = await req.json();
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: "No hay ninguna cuenta con ese email. La persona debe registrarse primero." },
      { status: 404 }
    );
  }

  const course = await prisma.onlineCourse.findUnique({
    where: { id: onlineCourseId },
  });
  if (!course) {
    return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  }

  const product = await prisma.product.findFirst({
    where: { isOnlineCourse: true, onlineCourseId },
  });
  if (!product) {
    return NextResponse.json(
      {
        error:
          "Este curso no tiene un producto vinculado. En Productos, editá o creá un producto y asociá este curso online.",
      },
      { status: 400 }
    );
  }

  const existingPurchase = await prisma.userCoursePurchase.findFirst({
    where: { userId: user.id, onlineCourseId },
  });
  if (existingPurchase) {
    return NextResponse.json({ ok: true, alreadyHadAccess: true });
  }

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      total: 0,
      status: "PAID",
      source: "PRODUCT",
      checkoutPaymentMethod: "BANK_TRANSFER",
      paymentProvider: "manual_online_access",
      notes: `Acceso manual desde admin — curso: ${course.title}`,
      items: {
        create: {
          itemType: "PRODUCT",
          productId: product.id,
          productName: product.name,
          quantity: 1,
          price: 0,
        },
      },
    },
  });

  await syncOnlineCourseAccessFromOrder(order.id, "PAID");

  return NextResponse.json({ ok: true, orderId: order.id });
}
