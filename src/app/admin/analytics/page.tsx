"use client";

import { api } from "@/lib/public-api";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FiBarChart2,
  FiCalendar,
  FiEye,
  FiShoppingBag,
  FiShoppingCart,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import { formatPrice } from "@/lib/utils";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
} from "recharts";

type Preset = "today" | "7" | "30" | "custom";

interface AnalyticsPayload {
  range: { start: string; end: string; startYmd: string; endYmd: string };
  metrics: {
    pageViews: number;
    uniqueSessions: number;
    conversionRate: number;
    revenue: number;
    avgOrderValue: number;
    abandonedCarts: number;
    paidOrders: number;
  };
  funnel: {
    visits: number;
    withCart: number;
    checkout: number;
    purchase: number;
  };
  products: {
    topViewed: { productId: string; name: string; count: number }[];
    topAdded: { productId: string; name: string; count: number }[];
    topSold: { productId: string; name: string; quantity: number; revenue: number }[];
  };
  series: {
    byDay: {
      date: string;
      pageViews: number;
      addToCart: number;
      beginCheckout: number;
      purchases: number;
      revenue: number;
    }[];
  };
}

function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDayLocal(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDayLocal(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function pct(part: number, whole: number): string {
  if (whole <= 0) return "0";
  return `${Math.round((part / whole) * 1000) / 10}%`;
}

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof FiBarChart2;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
            {label}
          </p>
          <p className="text-xl font-extrabold text-warm-gray mt-1 tabular-nums">
            {value}
          </p>
          {sub && (
            <p className="text-xs text-gray-500 mt-1 leading-snug">{sub}</p>
          )}
        </div>
        <span className="w-9 h-9 rounded-xl bg-primary-light/35 flex items-center justify-center text-primary-dark shrink-0">
          <Icon size={18} />
        </span>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [preset, setPreset] = useState<Preset>("30");
  const [customStart, setCustomStart] = useState(() =>
    toInputDate(startOfDayLocal(new Date())),
  );
  const [customEnd, setCustomEnd] = useState(() =>
    toInputDate(endOfDayLocal(new Date())),
  );
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const { startDate, endDate } = useMemo(() => {
    if (preset === "custom") {
      return {
        startDate: startOfDayLocal(new Date(customStart)),
        endDate: endOfDayLocal(new Date(customEnd)),
      };
    }
    if (preset === "today") {
      const s = startOfDayLocal(new Date());
      return { startDate: s, endDate: endOfDayLocal(new Date()) };
    }
    const days = preset === "7" ? 6 : 29;
    const s = startOfDayLocal(new Date());
    s.setDate(s.getDate() - days);
    return { startDate: s, endDate: endOfDayLocal(new Date()) };
  }, [preset, customStart, customEnd]);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("startDate", toInputDate(startDate));
    p.set("endDate", toInputDate(endDate));
    return p.toString();
  }, [startDate, endDate]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(api(`/api/admin/analytics?${qs}`));
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || "No se pudieron cargar las analíticas");
      }
      setData(await r.json());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    load();
  }, [load]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.series.byDay.map((d) => ({
      ...d,
      label: d.date.slice(5),
    }));
  }, [data]);

  const funnel = data?.funnel;
  const funnelBase = funnel?.visits ?? 1;

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-warm-gray">
            Analítica del sitio
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Eventos propios, embudo y productos (tienda). Los ingresos refieren a
            órdenes de producto pagadas.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["today", "Hoy"],
                ["7", "7 días"],
                ["30", "30 días"],
                ["custom", "Personalizado"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setPreset(k)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                  preset === k
                    ? "bg-primary text-white shadow-sm"
                    : "bg-soft-gray text-gray-600 hover:bg-primary-light/30"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg border border-gray-200"
              />
              <span className="text-gray-400 text-xs">—</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg border border-gray-200"
              />
            </div>
          )}
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">
          {err}
        </div>
      )}

      {loading && !data && (
        <div className="text-gray-400 py-16 text-center">
          Cargando analítica…
        </div>
      )}

      {data && (
        <>
          <section>
            <h2 className="text-sm font-bold text-warm-gray uppercase tracking-wide mb-3 flex items-center gap-2">
              <FiBarChart2 className="text-primary" />
              Métricas
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricCard
                label="Visitas (páginas)"
                value={String(data.metrics.pageViews)}
                sub="Eventos page_view"
                icon={FiEye}
              />
              <MetricCard
                label="Sesiones únicas"
                value={String(data.metrics.uniqueSessions)}
                sub="Por sessionId en page_view"
                icon={FiUsers}
              />
              <MetricCard
                label="Conversión"
                value={`${data.metrics.conversionRate}%`}
                sub="Órdenes pagadas / sesiones únicas"
                icon={FiTrendingUp}
              />
              <MetricCard
                label="Ingresos (producto)"
                value={formatPrice(data.metrics.revenue)}
                sub={`${data.metrics.paidOrders} órdenes pagadas`}
                icon={FiShoppingCart}
              />
              <MetricCard
                label="Ticket promedio"
                value={formatPrice(data.metrics.avgOrderValue)}
                sub="Sobre órdenes de producto pagadas"
                icon={FiShoppingBag}
              />
              <MetricCard
                label="Carritos abandonados"
                value={String(data.metrics.abandonedCarts)}
                sub="Marcados por inactividad al cargar este panel (ANALYTICS_CART_ABANDON_AFTER_MINUTES)"
                icon={FiShoppingCart}
              />
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-warm-gray uppercase tracking-wide mb-4 flex items-center gap-2">
                <FiTrendingUp className="text-secondary-dark" />
                Embudo
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Sesiones distintas que dispararon cada evento en el rango.
              </p>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between gap-2">
                  <span className="text-gray-600">Visitas</span>
                  <span className="font-bold text-warm-gray tabular-nums">
                    {funnel?.visits ?? 0}
                  </span>
                </li>
                <li className="flex justify-between gap-2">
                  <span className="text-gray-600">Agregaron al carrito</span>
                  <span className="font-semibold text-warm-gray tabular-nums">
                    {funnel?.withCart ?? 0}{" "}
                    <span className="text-gray-400 font-normal text-xs">
                      ({pct(funnel?.withCart ?? 0, funnelBase)})
                    </span>
                  </span>
                </li>
                <li className="flex justify-between gap-2">
                  <span className="text-gray-600">Iniciaron checkout</span>
                  <span className="font-semibold text-warm-gray tabular-nums">
                    {funnel?.checkout ?? 0}{" "}
                    <span className="text-gray-400 font-normal text-xs">
                      ({pct(funnel?.checkout ?? 0, funnelBase)})
                    </span>
                  </span>
                </li>
                <li className="flex justify-between gap-2">
                  <span className="text-gray-600">Evento compra</span>
                  <span className="font-semibold text-warm-gray tabular-nums">
                    {funnel?.purchase ?? 0}{" "}
                    <span className="text-gray-400 font-normal text-xs">
                      ({pct(funnel?.purchase ?? 0, funnelBase)})
                    </span>
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm min-h-[280px]">
              <h2 className="text-sm font-bold text-warm-gray uppercase tracking-wide mb-2 flex items-center gap-2">
                <FiCalendar className="text-accent-dark" />
                Actividad diaria
              </h2>
              <p className="text-xs text-gray-500 mb-2">
                Vistas de página vs. ingresos (producto pagado).
              </p>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 10 }}
                      allowDecimals={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #f0d4d4",
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      yAxisId="left"
                      dataKey="pageViews"
                      name="Vistas"
                      fill="#e8a4bc"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      name="Ingresos"
                      stroke="#7c3aed"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold text-warm-gray uppercase tracking-wide mb-3">
              Eventos de carrito y compra (por día)
            </h2>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #f0d4d4",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="addToCart" name="Al carrito" fill="#f4b942" />
                  <Bar dataKey="beginCheckout" name="Checkout" fill="#5b8def" />
                  <Bar dataKey="purchases" name="Compras (evt.)" fill="#34a853" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold text-warm-gray uppercase tracking-wide mb-3">
              Productos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">
                  Más vistos
                </h3>
                <ol className="space-y-2 text-sm">
                  {data.products.topViewed.length === 0 && (
                    <li className="text-gray-400 text-xs">Sin datos</li>
                  )}
                  {data.products.topViewed.map((r, i) => (
                    <li
                      key={r.productId}
                      className="flex justify-between gap-2 border-b border-gray-50 pb-2 last:border-0"
                    >
                      <span className="text-gray-600 truncate">
                        <span className="text-gray-400 mr-1">{i + 1}.</span>
                        <Link
                          href={`/admin/productos/${r.productId}`}
                          className="hover:text-primary font-medium text-warm-gray"
                        >
                          {r.name}
                        </Link>
                      </span>
                      <span className="font-semibold text-warm-gray shrink-0 tabular-nums">
                        {r.count} vistas
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">
                  Más al carrito
                </h3>
                <ol className="space-y-2 text-sm">
                  {data.products.topAdded.length === 0 && (
                    <li className="text-gray-400 text-xs">Sin datos</li>
                  )}
                  {data.products.topAdded.map((r, i) => (
                    <li
                      key={r.productId}
                      className="flex justify-between gap-2 border-b border-gray-50 pb-2 last:border-0"
                    >
                      <span className="text-gray-600 truncate">
                        <span className="text-gray-400 mr-1">{i + 1}.</span>
                        <Link
                          href={`/admin/productos/${r.productId}`}
                          className="hover:text-primary font-medium text-warm-gray"
                        >
                          {r.name}
                        </Link>
                      </span>
                      <span className="font-semibold text-warm-gray shrink-0 tabular-nums">
                        {r.count} eventos
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">
                  Más vendidos
                </h3>
                <ol className="space-y-2 text-sm">
                  {data.products.topSold.length === 0 && (
                    <li className="text-gray-400 text-xs">Sin datos</li>
                  )}
                  {data.products.topSold.map((r, i) => (
                    <li
                      key={r.productId}
                      className="flex justify-between gap-2 border-b border-gray-50 pb-2 last:border-0"
                    >
                      <span className="text-gray-600 truncate">
                        <span className="text-gray-400 mr-1">{i + 1}.</span>
                        <Link
                          href={`/admin/productos/${r.productId}`}
                          className="hover:text-primary font-medium text-warm-gray"
                        >
                          {r.name}
                        </Link>
                      </span>
                      <span className="shrink-0 text-xs text-right">
                        <span className="font-semibold tabular-nums">
                          {r.quantity} uds.
                        </span>
                        <br />
                        <span className="text-gray-400">
                          {formatPrice(r.revenue)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
