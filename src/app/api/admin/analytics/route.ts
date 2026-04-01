import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { markStaleCartsAbandoned } from "@/lib/analytics-cart-server";
import {
  uyAddCalendarDays,
  uyEachCalendarDayInclusive,
  uyEndOfCalendarDay,
  uyStartOfCalendarDay,
  uyTodayYmd,
  uyYmdFromUtc,
} from "@/lib/date-uruguay";
import type { OrderStatus } from "@prisma/client";

const PAID: OrderStatus[] = ["PAID", "SHIPPED", "DELIVERED"];

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

type SeriesRow = { ymd: string; type: string; cnt: bigint };

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  await markStaleCartsAbandoned();

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
    pageViewsTotal,
    uniquePageViewSessions,
    funnelRows,
    abandonedCount,
    paidOrdersAgg,
    topViewed,
    topAdded,
    topSoldRows,
    seriesRows,
    paidOrdersForSeries,
  ] = await Promise.all([
    prisma.analyticsEvent.count({
      where: { type: "page_view", createdAt: { gte: start, lte: end } },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["sessionId"],
      where: { type: "page_view", createdAt: { gte: start, lte: end } },
      _count: { _all: true },
    }),
    prisma.analyticsEvent.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        type: { in: ["page_view", "add_to_cart", "begin_checkout", "purchase"] },
      },
      select: { sessionId: true, type: true },
      distinct: ["sessionId", "type"],
    }),
    prisma.cart.count({
      where: {
        status: "ABANDONED",
        abandonedAt: { gte: start, lte: end },
      },
    }),
    prisma.order.aggregate({
      where: {
        status: { in: PAID },
        source: "PRODUCT",
        createdAt: { gte: start, lte: end },
      },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["productId"],
      where: {
        type: "view_item",
        createdAt: { gte: start, lte: end },
        productId: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { productId: "desc" } },
      take: 12,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["productId"],
      where: {
        type: "add_to_cart",
        createdAt: { gte: start, lte: end },
        productId: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { productId: "desc" } },
      take: 12,
    }),
    prisma.$queryRaw<{ productId: string; qty: bigint; revenue: number }[]>(
      Prisma.sql`
      SELECT oi."productId",
             SUM(oi.quantity)::bigint AS qty,
             SUM(oi.price * oi.quantity)::double precision AS revenue
      FROM "OrderItem" oi
      INNER JOIN "Order" o ON o.id = oi."orderId"
      WHERE oi."itemType" = 'PRODUCT'
        AND oi."productId" IS NOT NULL
        AND o.status IN ('PAID', 'SHIPPED', 'DELIVERED')
        AND o.source = 'PRODUCT'
        AND o."createdAt" >= ${start}
        AND o."createdAt" <= ${end}
      GROUP BY oi."productId"
      ORDER BY qty DESC NULLS LAST
      LIMIT 12
    `
    ),
    prisma.$queryRaw<SeriesRow[]>(Prisma.sql`
      SELECT to_char((("createdAt" AT TIME ZONE 'America/Montevideo')::date), 'YYYY-MM-DD') AS ymd,
             type,
             COUNT(*)::bigint AS cnt
      FROM "AnalyticsEvent"
      WHERE "createdAt" >= ${start}
        AND "createdAt" <= ${end}
        AND type IN ('page_view', 'add_to_cart', 'begin_checkout', 'purchase')
      GROUP BY 1, type
      ORDER BY 1 ASC
    `),
    prisma.order.findMany({
      where: {
        status: { in: PAID },
        source: "PRODUCT",
        createdAt: { gte: start, lte: end },
      },
      select: { total: true, createdAt: true },
    }),
  ]);

  const uniqueVisitors = uniquePageViewSessions.length;

  const funnelSessions = {
    page_view: new Set<string>(),
    add_to_cart: new Set<string>(),
    begin_checkout: new Set<string>(),
    purchase: new Set<string>(),
  };
  for (const row of funnelRows) {
    if (row.type in funnelSessions) {
      funnelSessions[row.type as keyof typeof funnelSessions].add(row.sessionId);
    }
  }

  const revenue = paidOrdersAgg._sum.total ?? 0;
  const paidCount = paidOrdersAgg._count._all;
  const avgOrderValue = paidCount > 0 ? revenue / paidCount : 0;
  const conversionRate =
    uniqueVisitors > 0 ? (paidCount / uniqueVisitors) * 100 : 0;

  const productIds = new Set<string>();
  for (const r of topViewed) {
    if (r.productId) productIds.add(r.productId);
  }
  for (const r of topAdded) {
    if (r.productId) productIds.add(r.productId);
  }
  for (const r of topSoldRows) {
    if (r.productId) productIds.add(r.productId);
  }

  const products = await prisma.product.findMany({
    where: { id: { in: [...productIds] } },
    select: { id: true, name: true },
  });
  const nameById = new Map(products.map((p) => [p.id, p.name]));

  const mapTop = (
    rows: { productId: string | null; _count: { _all: number } }[]
  ) =>
    rows
      .filter((r) => r.productId)
      .map((r) => ({
        productId: r.productId as string,
        name: nameById.get(r.productId as string) ?? "—",
        count: r._count._all,
      }));

  const mapSold = (rows: { productId: string; qty: bigint; revenue: number }[]) =>
    rows.map((r) => ({
      productId: r.productId,
      name: nameById.get(r.productId) ?? "—",
      quantity: Number(r.qty),
      revenue: r.revenue,
    }));

  const dayKeys = uyEachCalendarDayInclusive(startYmd, endYmd);
  const byDay = new Map<
    string,
    { pageViews: number; addToCart: number; beginCheckout: number; purchases: number }
  >();
  for (const k of dayKeys) {
    byDay.set(k, {
      pageViews: 0,
      addToCart: 0,
      beginCheckout: 0,
      purchases: 0,
    });
  }

  for (const row of seriesRows) {
    const ymd = row.ymd;
    if (!byDay.has(ymd)) continue;
    const cell = byDay.get(ymd)!;
    const n = Number(row.cnt);
    if (row.type === "page_view") cell.pageViews += n;
    else if (row.type === "add_to_cart") cell.addToCart += n;
    else if (row.type === "begin_checkout") cell.beginCheckout += n;
    else if (row.type === "purchase") cell.purchases += n;
  }

  const series = dayKeys.map((date) => ({
    date,
    ...byDay.get(date)!,
  }));

  const revenueByDay = new Map<string, number>();
  for (const k of dayKeys) revenueByDay.set(k, 0);
  for (const o of paidOrdersForSeries) {
    const k = uyYmdFromUtc(o.createdAt);
    if (revenueByDay.has(k)) {
      revenueByDay.set(k, (revenueByDay.get(k) ?? 0) + o.total);
    }
  }

  const seriesWithRevenue = series.map((row) => ({
    ...row,
    revenue: revenueByDay.get(row.date) ?? 0,
  }));

  return NextResponse.json({
    range: {
      start: start.toISOString(),
      end: end.toISOString(),
      startYmd,
      endYmd,
    },
    metrics: {
      pageViews: pageViewsTotal,
      uniqueSessions: uniqueVisitors,
      conversionRate: Math.round(conversionRate * 10) / 10,
      revenue,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      abandonedCarts: abandonedCount,
      paidOrders: paidCount,
    },
    funnel: {
      visits: funnelSessions.page_view.size,
      withCart: funnelSessions.add_to_cart.size,
      checkout: funnelSessions.begin_checkout.size,
      purchase: funnelSessions.purchase.size,
    },
    products: {
      topViewed: mapTop(topViewed),
      topAdded: mapTop(topAdded),
      topSold: mapSold(topSoldRows),
    },
    series: { byDay: seriesWithRevenue },
  });
}
