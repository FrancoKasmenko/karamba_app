import {
  OrderSource,
  type BookingStatus,
  type OrderStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fireAndForget, notifyCourseAccessGranted } from "@/lib/email-events";

export function orderStatusToBookingStatus(status: OrderStatus): BookingStatus {
  if (status === "PAID" || status === "SHIPPED" || status === "DELIVERED") {
    return "PAID";
  }
  if (status === "CANCELLED") return "CANCELLED";
  return "PENDING";
}

export async function syncCourseBookingFromOrder(
  orderId: string,
  orderStatus: OrderStatus,
  paymentId?: string | null
) {
  const booking = await prisma.courseBooking.findUnique({ where: { orderId } });
  if (!booking) return;

  const data: { status: BookingStatus; paymentId?: string } = {
    status: orderStatusToBookingStatus(orderStatus),
  };
  if (paymentId) data.paymentId = paymentId;

  await prisma.courseBooking.update({
    where: { id: booking.id },
    data,
  });
}

function isOrderPaidLike(status: OrderStatus) {
  return status === "PAID" || status === "SHIPPED" || status === "DELIVERED";
}

/**
 * Otorga o revoca acceso a cursos online según el estado de la orden (solo órdenes PRODUCT).
 */
export async function syncOnlineCourseAccessFromOrder(
  orderId: string,
  orderStatus: OrderStatus,
  _paymentId?: string | null
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      source: true,
      items: {
        select: {
          product: {
            select: { isOnlineCourse: true, onlineCourseId: true },
          },
        },
      },
    },
  });

  if (!order || order.source !== OrderSource.PRODUCT) return;

  const courseIds = new Set<string>();
  for (const item of order.items) {
    const p = item.product;
    if (p?.isOnlineCourse && p.onlineCourseId) {
      courseIds.add(p.onlineCourseId);
    }
  }

  if (courseIds.size === 0) return;

  if (orderStatus === "CANCELLED") {
    await prisma.userCoursePurchase.deleteMany({
      where: { orderId: order.id },
    });
    return;
  }

  if (!isOrderPaidLike(orderStatus)) return;

  for (const onlineCourseId of courseIds) {
    await prisma.userCoursePurchase.upsert({
      where: {
        orderId_onlineCourseId: {
          orderId: order.id,
          onlineCourseId,
        },
      },
      create: {
        userId: order.userId,
        onlineCourseId,
        orderId: order.id,
      },
      update: {},
    });

    await prisma.userCourse.upsert({
      where: {
        userId_onlineCourseId: {
          userId: order.userId,
          onlineCourseId,
        },
      },
      create: {
        userId: order.userId,
        onlineCourseId,
        progress: 0,
      },
      update: {},
    });

    fireAndForget(notifyCourseAccessGranted(order.id, onlineCourseId));
  }
}
