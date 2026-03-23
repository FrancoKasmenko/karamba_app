import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import type { OrderStatus } from "@prisma/client";
import {
  uyAddCalendarDays,
  uyEachCalendarDayInclusive,
  uyEndOfCalendarDay,
  uyStartOfCalendarDay,
  uyTodayYmd,
  uyYmdFromUtc,
} from "@/lib/date-uruguay";

const PAID: OrderStatus[] = ["PAID", "SHIPPED", "DELIVERED"];

function addDaysUtc(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const startParam = searchParams.get("startDate") ?? searchParams.get("start");
  const endParam = searchParams.get("endDate") ?? searchParams.get("end");

  const todayUy = uyTodayYmd();
  let endYmd = endParam && isYmd(endParam) ? endParam : todayUy;
  let startYmd =
    startParam && isYmd(startParam) ? startParam : uyAddCalendarDays(endYmd, -29);

  if (startYmd > endYmd) {
    const t = startYmd;
    startYmd = endYmd;
    endYmd = t;
  }

  const start = uyStartOfCalendarDay(startYmd);
  const end = uyEndOfCalendarDay(endYmd);

  const [
    ordersInRange,
    usersTotal,
    usersNew,
    productUnitsAgg,
    courseUnitsAgg,
    publishedCourses,
    upcomingSessionsList,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: {
        id: true,
        total: true,
        status: true,
        source: true,
        createdAt: true,
      },
    }),
    prisma.user.count(),
    prisma.user.count({
      where: { createdAt: { gte: start, lte: end } },
    }),
    prisma.orderItem.aggregate({
      _sum: { quantity: true },
      where: {
        itemType: "PRODUCT",
        order: {
          status: { in: PAID },
          createdAt: { gte: start, lte: end },
        },
      },
    }),
    prisma.orderItem.aggregate({
      _sum: { quantity: true },
      where: {
        itemType: "COURSE",
        order: {
          status: { in: PAID },
          createdAt: { gte: start, lte: end },
        },
      },
    }),
    prisma.course.count({ where: { published: true } }),
    (() => {
      const now = new Date();
      const horizon = addDaysUtc(now, 90);
      return prisma.courseSession.findMany({
        where: { date: { gte: now, lte: horizon } },
        select: {
          capacity: true,
          _count: {
            select: {
              bookings: { where: { status: { not: "CANCELLED" } } },
            },
          },
        },
      });
    })(),
  ]);

  const paidSet = new Set<string>(PAID);
  let revenueTotal = 0;
  let revenueProducts = 0;
  let revenueCourses = 0;

  for (const o of ordersInRange) {
    if (!paidSet.has(o.status)) continue;
    revenueTotal += o.total;
    if (o.source === "PRODUCT") revenueProducts += o.total;
    if (o.source === "COURSE") revenueCourses += o.total;
  }

  const ordersCount = ordersInRange.length;
  const paidOrdersCount = ordersInRange.filter((o) => paidSet.has(o.status)).length;

  let capacityUpcoming = 0;
  let bookedSlots = 0;
  for (const s of upcomingSessionsList) {
    capacityUpcoming += s.capacity;
    bookedSlots += s._count.bookings;
  }
  const availableSlots = Math.max(0, capacityUpcoming - bookedSlots);

  const dayKeys = uyEachCalendarDayInclusive(startYmd, endYmd);
  const byDay = new Map<string, { orders: number; revenue: number }>();
  for (const k of dayKeys) {
    byDay.set(k, { orders: 0, revenue: 0 });
  }

  for (const o of ordersInRange) {
    const key = uyYmdFromUtc(o.createdAt);
    if (!byDay.has(key)) continue;
    const row = byDay.get(key)!;
    row.orders += 1;
    if (paidSet.has(o.status)) row.revenue += o.total;
  }

  const seriesByDay = dayKeys.map((date) => ({
    date,
    orders: byDay.get(date)!.orders,
    revenue: byDay.get(date)!.revenue,
  }));

  const distTotal = revenueProducts + revenueCourses;
  const distribution = {
    productsPct: distTotal > 0 ? Math.round((revenueProducts / distTotal) * 1000) / 10 : 0,
    coursesPct: distTotal > 0 ? Math.round((revenueCourses / distTotal) * 1000) / 10 : 0,
    productsAmount: revenueProducts,
    coursesAmount: revenueCourses,
  };

  return NextResponse.json({
    range: { start: start.toISOString(), end: end.toISOString(), startYmd, endYmd },
    revenue: {
      total: revenueTotal,
      products: revenueProducts,
      courses: revenueCourses,
    },
    sales: {
      orders: ordersCount,
      paidOrders: paidOrdersCount,
      productUnits: productUnitsAgg._sum.quantity ?? 0,
      courseSpots: courseUnitsAgg._sum.quantity ?? 0,
    },
    users: {
      total: usersTotal,
      newInRange: usersNew,
    },
    courses: {
      published: publishedCourses,
      upcomingSessions: upcomingSessionsList.length,
      bookedSlots,
      availableSlots,
      capacityUpcoming,
    },
    series: { byDay: seriesByDay },
    distribution,
  });
}
