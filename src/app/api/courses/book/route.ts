import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  describeMercadoPagoError,
  getMercadoPagoClient,
  Preference,
} from "@/lib/mercadopago";
import { getBaseUrl, getWebhookUrl, isPublicUrl } from "@/lib/base-url";
import { fireAndForget, notifyOrderCreated } from "@/lib/email-events";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Debés iniciar sesión para reservar" }, { status: 401 });
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Sesión no especificada" }, { status: 400 });
    }

    const courseSession = await prisma.courseSession.findUnique({
      where: { id: sessionId },
      include: {
        course: true,
        _count: { select: { bookings: { where: { status: { not: "CANCELLED" } } } } },
      },
    });

    if (!courseSession) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    if (courseSession._count.bookings >= courseSession.capacity) {
      return NextResponse.json({ error: "No hay cupos disponibles" }, { status: 409 });
    }

    const existingBooking = await prisma.courseBooking.findUnique({
      where: {
        userId_courseSessionId: {
          userId: session.user.id,
          courseSessionId: sessionId,
        },
      },
    });

    if (existingBooking && existingBooking.status === "PAID") {
      return NextResponse.json({ error: "Ya tenés una reserva confirmada para esta sesión" }, { status: 409 });
    }

    const dateStr = new Date(courseSession.date).toLocaleDateString("es-UY", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const lineName = `Curso: ${courseSession.course.title} – ${dateStr}`;
    const price = Number(courseSession.course.price);

    const mpClient = await getMercadoPagoClient();

    if (existingBooking?.orderId) {
      const prevOrder = await prisma.order.findUnique({
        where: { id: existingBooking.orderId },
      });
      if (
        prevOrder &&
        prevOrder.source === "COURSE" &&
        prevOrder.status === "PENDING" &&
        existingBooking.status === "PENDING"
      ) {
        if (!mpClient) {
          return NextResponse.json(
            {
              error:
                "Mercado Pago no está habilitado. Configuralo en Administración → Pagos.",
            },
            { status: 503 }
          );
        }
        const preference = new Preference(mpClient);
        const baseUrl = getBaseUrl();
        const preferenceBody = {
          items: [
            {
              id: `course-${courseSession.course.id}`,
              title: `${courseSession.course.title} - ${dateStr} ${courseSession.startTime}`,
              unit_price: price,
              quantity: 1,
              currency_id: "UYU",
            },
          ],
          back_urls: {
            success: `${baseUrl}/cursos/reserva-exitosa?orderId=${prevOrder.id}`,
            failure: `${baseUrl}/cursos/${courseSession.course.slug}?error=payment_failed`,
            pending: `${baseUrl}/cursos/reserva-exitosa?orderId=${prevOrder.id}&pending=true`,
          },
          auto_return: "approved" as const,
          external_reference: prevOrder.id,
          payer: { email: session.user.email },
          notification_url: undefined as string | undefined,
        };
        if (isPublicUrl()) preferenceBody.notification_url = getWebhookUrl();
        try {
          const result = await preference.create({ body: preferenceBody });
          return NextResponse.json({
            orderId: prevOrder.id,
            bookingId: existingBooking.id,
            initPoint: result.init_point,
          });
        } catch (mpErr) {
          console.error("[COURSE BOOKING] Mercado Pago API (retry):", mpErr);
          const detail = describeMercadoPagoError(mpErr);
          return NextResponse.json(
            {
              error: detail
                ? `Mercado Pago: ${detail}`
                : "No se pudo iniciar el pago. Revisá el Access token en Admin → Pagos.",
            },
            { status: 502 }
          );
        }
      }
    }

    if (!mpClient) {
      return NextResponse.json(
        {
          error:
            "Mercado Pago no está habilitado. Configuralo en Administración → Pagos (token y activar).",
        },
        { status: 503 }
      );
    }

    const { order, booking } = await prisma.$transaction(async (tx) => {
      const ord = await tx.order.create({
        data: {
          userId: session.user.id,
          total: price,
          status: "PENDING",
          source: "COURSE",
          checkoutPaymentMethod: "MERCADOPAGO",
          notes: `Reserva curso · sesión ${sessionId}`,
          items: {
            create: [
              {
                itemType: "COURSE",
                productName: lineName,
                quantity: 1,
                price,
                courseSessionId: sessionId,
              },
            ],
          },
        },
      });

      let bk;
      if (existingBooking) {
        bk = await tx.courseBooking.update({
          where: { id: existingBooking.id },
          data: { status: "PENDING", orderId: ord.id },
        });
      } else {
        bk = await tx.courseBooking.create({
          data: {
            userId: session.user.id,
            courseSessionId: sessionId,
            status: "PENDING",
            orderId: ord.id,
          },
        });
      }

      return { order: ord, booking: bk };
    });

    console.log(
      `[COURSE BOOKING] Orden ${order.id} · Reserva ${booking.id} | ${courseSession.course.title} | ${session.user.email}`
    );

    fireAndForget(notifyOrderCreated(order.id));

    const preference = new Preference(mpClient);
    const baseUrl = getBaseUrl();

    const preferenceBody = {
      items: [
        {
          id: `course-${courseSession.course.id}`,
          title: `${courseSession.course.title} - ${dateStr} ${courseSession.startTime}`,
          unit_price: price,
          quantity: 1,
          currency_id: "UYU",
        },
      ],
      back_urls: {
        success: `${baseUrl}/cursos/reserva-exitosa?orderId=${order.id}`,
        failure: `${baseUrl}/cursos/${courseSession.course.slug}?error=payment_failed`,
        pending: `${baseUrl}/cursos/reserva-exitosa?orderId=${order.id}&pending=true`,
      },
      auto_return: "approved" as const,
      external_reference: order.id,
      payer: { email: session.user.email },
      notification_url: undefined as string | undefined,
    };

    if (isPublicUrl()) {
      preferenceBody.notification_url = getWebhookUrl();
    }

    try {
      const result = await preference.create({ body: preferenceBody });
      return NextResponse.json({
        orderId: order.id,
        bookingId: booking.id,
        initPoint: result.init_point,
      });
    } catch (mpErr) {
      console.error("[COURSE BOOKING] Mercado Pago API:", mpErr);
      const detail = describeMercadoPagoError(mpErr);
      await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED" },
        }),
        prisma.courseBooking.update({
          where: { id: booking.id },
          data: { status: "CANCELLED" },
        }),
      ]);
      return NextResponse.json(
        {
          error: detail
            ? `Mercado Pago: ${detail}`
            : "Mercado Pago rechazó crear el pago. Revisá el Access token (producción) en Admin → Pagos.",
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("[COURSE BOOKING] Error:", error);
    return NextResponse.json({ error: "Error al procesar la reserva" }, { status: 500 });
  }
}
