"use client";
import { api } from "@/lib/public-api";

import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiBarChart2,
  FiBook,
  FiCalendar,
  FiDollarSign,
  FiPackage,
  FiShoppingCart,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import { formatPrice } from "@/lib/utils";

type Preset = "today" | "7" | "30" | "custom";

interface DashboardPayload {
  range: { start: string; end: string };
  revenue: { total: number; products: number; courses: number };
  sales: {
    orders: number;
    paidOrders: number;
    productUnits: number;
    courseSpots: number;
  };
  users: { total: number; newInRange: number };
  courses: {
    published: number;
    upcomingSessions: number;
    bookedSlots: number;
    availableSlots: number;
    capacityUpcoming: number;
  };
  series: { byDay: { date: string; orders: number; revenue: number }[] };
  distribution: {
    productsPct: number;
    coursesPct: number;
    productsAmount: number;
    coursesAmount: number;
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

export default function DashboardClient() {
  const [preset, setPreset] = useState<Preset>("30");
  const [customStart, setCustomStart] = useState(() =>
    toInputDate(startOfDayLocal(new Date())),
  );
  const [customEnd, setCustomEnd] = useState(() =>
    toInputDate(endOfDayLocal(new Date())),
  );
  const [data, setData] = useState<DashboardPayload | null>(null);
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
      const r = await fetch(api(`/api/admin/dashboard-stats?${qs}`));
      if (!r.ok) throw new Error("No se pudieron cargar las métricas");
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

  const maxOrders = Math.max(
    1,
    ...(data?.series.byDay.map((d) => d.orders) ?? [0]),
  );
  const maxRev = Math.max(
    1,
    ...(data?.series.byDay.map((d) => d.revenue) ?? [0]),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-warm-gray">
            Dashboard
          </h1>
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
                className={`min-h-[40px] sm:min-h-0 px-3 py-2 sm:py-1.5 text-xs font-semibold rounded-full transition-colors touch-manipulation ${
                  preset === k
                    ? "bg-primary text-white shadow-sm"
                    : "bg-soft-gray text-gray-600 hover:bg-primary-light/30 active:bg-primary-light/40"
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
          Cargando métricas…
        </div>
      )}

      {data && (
        <>
          <section>
            <h2 className="text-sm font-bold text-warm-gray uppercase tracking-wide mb-3 flex items-center gap-2">
              <FiDollarSign className="text-primary" />
              Ingresos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard
                label="Ingresos totales (pagado)"
                value={formatPrice(data.revenue.total)}
                sub="Suma de órdenes pagadas en el rango"
                tone="mint"
                icon={FiTrendingUp}
              />
              <MetricCard
                label="Por productos"
                value={formatPrice(data.revenue.products)}
                sub="Órdenes tipo tienda"
                tone="secondary"
                icon={FiPackage}
              />
              <MetricCard
                label="Por cursos"
                value={formatPrice(data.revenue.courses)}
                sub="Órdenes tipo curso"
                tone="accent"
                icon={FiBook}
              />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold text-warm-gray uppercase tracking-wide mb-3 flex items-center gap-2">
              <FiShoppingCart className="text-secondary-dark" />
              Ventas
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Órdenes"
                value={String(data.sales.orders)}
                sub={`${data.sales.paidOrders} pagadas`}
                tone="primary"
                icon={FiShoppingCart}
              />
              <MetricCard
                label="Unidades producto"
                value={String(data.sales.productUnits)}
                sub="Ítems PRODUCT pagados"
                tone="secondary"
                icon={FiPackage}
              />
              <MetricCard
                label="Cupos curso"
                value={String(data.sales.courseSpots)}
                sub="Ítems COURSE pagados"
                tone="accent"
                icon={FiBook}
              />
              <MetricCard
                label="Usuarios nuevos"
                value={String(data.users.newInRange)}
                sub={`${data.users.total} total en la base`}
                tone="mint"
                icon={FiUsers}
              />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold text-warm-gray uppercase tracking-wide mb-3 flex items-center gap-2">
              <FiCalendar className="text-accent-dark" />
              Cursos (operativo)
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Cursos publicados"
                value={String(data.courses.published)}
                sub="Activos en catálogo"
                tone="primary"
                icon={FiBook}
              />
              <MetricCard
                label="Sesiones próximas"
                value={String(data.courses.upcomingSessions)}
                sub="Próximos 90 días"
                tone="secondary"
                icon={FiCalendar}
              />
              <MetricCard
                label="Cupos ocupados"
                value={String(data.courses.bookedSlots)}
                sub={`Capacidad ${data.courses.capacityUpcoming}`}
                tone="accent"
                icon={FiUsers}
              />
              <MetricCard
                label="Cupos libres"
                value={String(data.courses.availableSlots)}
                sub="Disponibles"
                tone="mint"
                icon={FiBarChart2}
              />
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-white rounded-2xl border border-primary-light/25 p-5 shadow-sm">
              <h3 className="font-bold text-warm-gray text-sm mb-4">
                Ventas por día (órdenes creadas)
              </h3>
              <div className="flex items-end gap-0.5 sm:gap-1 h-44 overflow-x-auto pb-1">
                {data.series.byDay.map((d) => (
                  <div
                    key={d.date}
                    className="flex flex-col h-full min-w-[18px] sm:min-w-[22px] flex-1"
                    title={`${d.date}: ${d.orders} órdenes`}
                  >
                    <div className="flex-1 flex items-end justify-center min-h-0">
                      <div
                        className="w-full max-w-[28px] rounded-t-md bg-secondary-light/80 min-h-[3px] transition-all"
                        style={{ height: `${(d.orders / maxOrders) * 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-gray-400 mt-1 text-center truncate w-full">
                      {d.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-primary-light/25 p-5 shadow-sm">
              <h3 className="font-bold text-warm-gray text-sm mb-4">
                Ingresos por día
              </h3>
              <div className="flex items-end gap-0.5 sm:gap-1 h-44 overflow-x-auto pb-1">
                {data.series.byDay.map((d) => (
                  <div
                    key={`r-${d.date}`}
                    className="flex flex-col h-full min-w-[18px] sm:min-w-[22px] flex-1"
                    title={`${d.date}: ${formatPrice(d.revenue)}`}
                  >
                    <div className="flex-1 flex items-end justify-center min-h-0">
                      <div
                        className="w-full max-w-[28px] rounded-t-md bg-primary/70 min-h-[3px]"
                        style={{ height: `${(d.revenue / maxRev) * 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-gray-400 mt-1 text-center truncate w-full">
                      {d.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-primary-light/25 p-5 shadow-sm">
            <h3 className="font-bold text-warm-gray text-sm mb-4">
              Distribución de ingresos: productos vs cursos
            </h3>
            <div className="flex flex-col sm:flex-row gap-6 items-center">
              <div className="relative w-36 h-36 shrink-0">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(
                      rgb(232, 99, 122) 0% ${data.distribution.productsPct}%,
                      rgb(168, 213, 186) ${data.distribution.productsPct}% 100%
                    )`,
                  }}
                />
                <div className="absolute inset-3 rounded-full bg-white flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-gray-400">Pagado</span>
                  <span className="text-xs font-bold text-warm-gray">
                    {formatPrice(
                      data.distribution.productsAmount +
                        data.distribution.coursesAmount,
                    )}
                  </span>
                </div>
              </div>
              <div className="flex-1 space-y-2 text-sm w-full max-w-md">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-primary" />
                    Productos
                  </span>
                  <span className="font-semibold text-warm-gray">
                    {data.distribution.productsPct}% ·{" "}
                    {formatPrice(data.distribution.productsAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-mint" />
                    Cursos
                  </span>
                  <span className="font-semibold text-warm-gray">
                    {data.distribution.coursesPct}% ·{" "}
                    {formatPrice(data.distribution.coursesAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "primary" | "secondary" | "accent" | "mint";
  icon: ComponentType<{ size?: number; className?: string }>;
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary-light/35 text-primary-dark",
    secondary: "bg-secondary-light/40 text-secondary-dark",
    accent: "bg-accent-light/50 text-accent-dark",
    mint: "bg-mint/45 text-green-800",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <div
          className={`w-9 h-9 rounded-xl ${tones[tone]} flex items-center justify-center`}
        >
          <Icon size={16} />
        </div>
      </div>
      <p className="text-xl sm:text-2xl font-extrabold text-warm-gray leading-tight">
        {value}
      </p>
      <p className="text-[11px] text-gray-400 mt-1">{sub}</p>
    </div>
  );
}
