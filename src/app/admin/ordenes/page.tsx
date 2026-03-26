"use client";
import { api } from "@/lib/public-api";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { FiEye, FiPackage } from "react-icons/fi";

interface Order {
  id: string;
  source?: "PRODUCT" | "COURSE";
  total: number;
  status: string;
  createdAt: string;
  paymentId: string | null;
  shippingName: string | null;
  user: { name: string | null; email: string };
  items: {
    productName: string;
    quantity: number;
    itemType?: "PRODUCT" | "COURSE";
  }[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800" },
  PROCESSING: { label: "Procesando", color: "bg-blue-100 text-blue-800" },
  PAID: { label: "Pagado", color: "bg-green-100 text-green-800" },
  SHIPPED: { label: "Enviado", color: "bg-purple-100 text-purple-800" },
  DELIVERED: { label: "Entregado", color: "bg-emerald-100 text-emerald-800" },
  CANCELLED: { label: "Cancelado", color: "bg-red-100 text-red-800" },
};

export default function AdminOrdenesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    fetch(api("/api/admin/orders"))
      .then((r) => r.json())
      .then((data) => {
        setOrders(data);
        setLoading(false);
      });
  }, []);

  const filtered =
    filter === "ALL" ? orders : orders.filter((o) => o.status === filter);

  const counts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  if (loading) return <div className="text-gray-400 py-10">Cargando...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-warm-gray">Órdenes</h1>
        <span className="text-sm text-gray-400">
          {orders.length} pedido{orders.length !== 1 && "s"}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter("ALL")}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${filter === "ALL" ? "bg-warm-gray text-white" : "bg-soft-gray text-gray-600 hover:bg-gray-200"}`}
        >
          Todas ({orders.length})
        </button>
        {Object.entries(statusLabels).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${filter === key ? val.color : "bg-soft-gray text-gray-600 hover:bg-gray-200"}`}
          >
            {val.label} ({counts[key] || 0})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <FiPackage size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">No hay órdenes</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-soft-gray text-left">
                <th className="px-5 py-3 text-xs font-semibold text-warm-gray uppercase">
                  Orden
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-warm-gray uppercase hidden sm:table-cell">
                  Cliente
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-warm-gray uppercase hidden md:table-cell">
                  Ítems
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-warm-gray uppercase">
                  Total
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-warm-gray uppercase">
                  Estado
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-warm-gray uppercase w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((order) => {
                const st = statusLabels[order.status] || {
                  label: order.status,
                  color: "bg-gray-100 text-gray-700",
                };
                return (
                  <tr
                    key={order.id}
                    className="hover:bg-cream/40 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-mono font-semibold text-warm-gray">
                          #{order.id.slice(-8).toUpperCase()}
                        </p>
                        {order.source === "COURSE" && (
                          <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-accent-light/55 text-accent-dark">
                            Curso
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString("es-UY", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <p className="text-sm font-medium text-gray-800">
                        {order.shippingName || order.user.name || "—"}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {order.user.email}
                      </p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <p className="text-xs text-gray-500 line-clamp-2 max-w-[200px]">
                        {order.items
                          .map((i) => `${i.productName} ×${i.quantity}`)
                          .join(", ")}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-bold text-warm-gray">
                        {formatPrice(order.total)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-full ${st.color}`}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/ordenes/${order.id}`}
                        className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light/20 transition-colors inline-flex"
                      >
                        <FiEye size={16} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
