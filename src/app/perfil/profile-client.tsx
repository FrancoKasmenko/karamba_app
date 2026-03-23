"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import {
  FiPackage,
  FiUser,
  FiBookOpen,
  FiCalendar,
  FiVideo,
  FiMapPin,
  FiEdit2,
  FiSave,
  FiLoader,
  FiChevronDown,
  FiDownload,
  FiLock,
} from "react-icons/fi";

interface Order {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  shippingName: string | null;
  items: { productName: string; quantity: number; price: number; variant: string | null }[];
}

interface Booking {
  id: string;
  status: string;
  createdAt: string;
  courseSession: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    meetingUrl: string | null;
    instructorName: string | null;
    course: {
      title: string;
      slug: string;
      image: string | null;
      courseType: string;
    };
  };
}

interface UserData {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
}

const orderStatusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700" },
  PROCESSING: { label: "Procesando", color: "bg-blue-100 text-blue-700" },
  PAID: { label: "Pagado", color: "bg-green-100 text-green-700" },
  SHIPPED: { label: "Enviado", color: "bg-purple-100 text-purple-700" },
  DELIVERED: { label: "Entregado", color: "bg-green-200 text-green-800" },
  CANCELLED: { label: "Cancelado", color: "bg-red-100 text-red-700" },
};

const bookingStatusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700" },
  PAID: { label: "Confirmado", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Cancelado", color: "bg-red-100 text-red-700" },
};

type Tab = "datos" | "ordenes" | "descargas" | "cursos";

interface DigitalDownloadRow {
  productId: string;
  productName: string;
  slug: string;
  fileName: string | null;
  orderId: string;
  purchasedAt: string;
}

export default function ProfileClient({
  user,
  orders,
  bookings,
}: {
  user: UserData | null;
  orders: Order[];
  bookings: Booking[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("datos");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: user?.address || "",
    city: user?.city || "",
  });
  const [expandedOrder, setExpandedOrder] = useState<string | null>(
    orders[0]?.id || null
  );
  const [downloads, setDownloads] = useState<DigitalDownloadRow[]>([]);
  const [downloadsLoading, setDownloadsLoading] = useState(true);
  const [pwdForm, setPwdForm] = useState({
    current: "",
    next: "",
    next2: "",
  });
  const [pwdSaving, setPwdSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile/digital-downloads")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: DigitalDownloadRow[]) =>
        setDownloads(Array.isArray(data) ? data : [])
      )
      .catch(() => setDownloads([]))
      .finally(() => setDownloadsLoading(false));
  }, []);

  const handlePasswordChange = async () => {
    if (pwdForm.next !== pwdForm.next2) {
      alert("Las contraseñas nuevas no coinciden");
      return;
    }
    setPwdSaving(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: pwdForm.current,
          newPassword: pwdForm.next,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Error al cambiar contraseña");
        setPwdSaving(false);
        return;
      }
      setPwdForm({ current: "", next: "", next2: "" });
      alert("Contraseña actualizada. Te enviamos un email de confirmación.");
    } catch {
      alert("Error de red");
    } finally {
      setPwdSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setEditing(false);
    } catch {
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "datos" as Tab, label: "Mis datos", icon: FiUser, count: null },
    { id: "ordenes" as Tab, label: "Pedidos", icon: FiPackage, count: orders.length },
    {
      id: "descargas" as Tab,
      label: "Mis descargas",
      icon: FiDownload,
      count: downloads.length,
    },
    { id: "cursos" as Tab, label: "Cursos", icon: FiBookOpen, count: bookings.length },
  ];

  const activeBookings = bookings.filter((b) => b.status !== "CANCELLED");

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-warm-gray mb-6">
        Mi Cuenta
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-soft-gray rounded-xl p-1 mb-8 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-white text-primary-dark shadow-sm"
                : "text-gray-500 hover:text-warm-gray"
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
            {tab.count !== null &&
              tab.count > 0 &&
              tab.id !== "descargas" && (
              <span className="text-[10px] bg-primary-light/40 text-primary-dark font-bold px-1.5 py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
            {tab.id === "descargas" && downloads.length > 0 && (
              <span className="text-[10px] bg-violet-100 text-violet-800 font-bold px-1.5 py-0.5 rounded-full">
                {downloads.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Datos personales */}
      {activeTab === "datos" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-primary-light/30 p-6 sm:p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-light/40 flex items-center justify-center">
                <FiUser size={20} className="text-primary-dark" />
              </div>
              <div>
                <h2 className="font-bold text-warm-gray">
                  {user?.name || "Usuario"}
                </h2>
                <p className="text-sm text-gray-400">{user?.email}</p>
              </div>
            </div>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-sm text-primary font-medium hover:text-primary-dark transition-colors"
              >
                <FiEdit2 size={14} />
                Editar
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 text-sm text-green-600 font-medium hover:text-green-700 transition-colors disabled:opacity-50"
              >
                {saving ? <FiLoader className="animate-spin" size={14} /> : <FiSave size={14} />}
                Guardar
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Nombre</label>
              {editing ? (
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary outline-none"
                />
              ) : (
                <p className="text-sm text-warm-gray">{user?.name || "—"}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
              <p className="text-sm text-warm-gray">{user?.email}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Teléfono</label>
              {editing ? (
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary outline-none"
                />
              ) : (
                <p className="text-sm text-warm-gray">{user?.phone || "—"}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Ciudad</label>
              {editing ? (
                <input
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary outline-none"
                />
              ) : (
                <p className="text-sm text-warm-gray">{user?.city || "—"}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-400 mb-1">Dirección</label>
              {editing ? (
                <input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary outline-none"
                />
              ) : (
                <p className="text-sm text-warm-gray">{user?.address || "—"}</p>
              )}
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <FiLock className="text-primary" size={18} />
              <h3 className="font-bold text-warm-gray text-sm">Cambiar contraseña</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Contraseña actual
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={pwdForm.current}
                  onChange={(e) =>
                    setPwdForm((f) => ({ ...f, current: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={pwdForm.next}
                  onChange={(e) =>
                    setPwdForm((f) => ({ ...f, next: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Repetir nueva
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={pwdForm.next2}
                  onChange={(e) =>
                    setPwdForm((f) => ({ ...f, next2: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  disabled={
                    pwdSaving ||
                    !pwdForm.current ||
                    !pwdForm.next ||
                    !pwdForm.next2
                  }
                  onClick={() => void handlePasswordChange()}
                  className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-95 disabled:opacity-40"
                >
                  {pwdSaving ? "Guardando…" : "Actualizar contraseña"}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Pedidos */}
      {activeTab === "ordenes" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-primary-light/30 p-12 text-center">
              <FiPackage size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 mb-4">Aún no tenés pedidos</p>
              <Link href="/productos" className="text-sm text-primary font-medium hover:underline">
                Ver productos →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const st = orderStatusLabels[order.status] || { label: order.status, color: "bg-gray-100 text-gray-700" };
                const isOpen = expandedOrder === order.id;

                return (
                  <div key={order.id} className="bg-white rounded-2xl border border-primary-light/20 overflow-hidden">
                    <button
                      onClick={() => setExpandedOrder(isOpen ? null : order.id)}
                      className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-soft-gray/30 transition-colors"
                    >
                      <div className="flex items-center gap-4 text-left min-w-0">
                        <div className="hidden sm:block w-10 h-10 bg-primary-light/20 rounded-xl flex items-center justify-center shrink-0">
                          <FiPackage size={16} className="text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-warm-gray">
                            Pedido #{order.id.slice(-8)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(order.createdAt).toLocaleDateString("es-UY", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>
                          {st.label}
                        </span>
                        <span className="text-sm font-bold text-warm-gray hidden sm:block">
                          {formatPrice(order.total)}
                        </span>
                        <FiChevronDown
                          size={14}
                          className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-primary-light/20 p-4 sm:p-5 bg-soft-gray/20">
                        <div className="space-y-2 mb-3">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-gray-600">
                                {item.productName} x{item.quantity}
                                {item.variant && (
                                  <span className="text-gray-400 ml-1">({item.variant})</span>
                                )}
                              </span>
                              <span className="font-medium text-warm-gray">
                                {formatPrice(item.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <hr className="border-primary-light/20 mb-3" />
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-600">Total</span>
                          <span className="font-bold text-primary-dark">{formatPrice(order.total)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Descargas digitales */}
      {activeTab === "descargas" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {downloadsLoading ? (
            <div className="bg-white rounded-2xl border border-primary-light/30 p-12 flex justify-center">
              <FiLoader className="animate-spin text-primary" size={28} />
            </div>
          ) : downloads.length === 0 ? (
            <div className="bg-white rounded-2xl border border-primary-light/30 p-12 text-center">
              <FiDownload size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 mb-4">
                No tenés productos digitales disponibles aún
              </p>
              <Link
                href="/productos"
                className="text-sm text-primary font-medium hover:underline"
              >
                Ver productos →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-4">
                Archivos disponibles mientras el pago de tu compra esté aprobado.
              </p>
              {downloads.map((d) => (
                <div
                  key={d.productId}
                  className="bg-white rounded-2xl border border-primary-light/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-violet-100 text-violet-800">
                        Descargable
                      </span>
                      <Link
                        href={`/productos/${d.slug}`}
                        className="text-sm font-bold text-warm-gray hover:text-primary truncate"
                      >
                        {d.productName}
                      </Link>
                    </div>
                    {d.fileName && (
                      <p className="text-xs text-gray-400 truncate">{d.fileName}</p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1">
                      Compra del{" "}
                      {new Date(d.purchasedAt).toLocaleDateString("es-UY", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <a
                    href={`/api/products/download?productId=${encodeURIComponent(d.productId)}`}
                    className="inline-flex items-center justify-center gap-2 shrink-0 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:opacity-95 transition-opacity"
                  >
                    <FiDownload size={16} />
                    Descargar archivo
                  </a>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Cursos */}
      {activeTab === "cursos" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {bookings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-primary-light/30 p-12 text-center">
              <FiBookOpen size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 mb-4">No estás inscripta en ningún curso</p>
              <Link href="/cursos" className="text-sm text-primary font-medium hover:underline">
                Ver cursos disponibles →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeBookings.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-warm-gray mb-3 uppercase tracking-wider">
                    Inscripciones activas
                  </h3>
                  <div className="space-y-3">
                    {activeBookings.map((b) => {
                      const bst = bookingStatusLabels[b.status] || bookingStatusLabels.PENDING;
                      const isVirtual = b.courseSession.course.courseType === "VIRTUAL";
                      const isPaid = b.status === "PAID";
                      const sessionDate = new Date(b.courseSession.date);
                      const isUpcoming = sessionDate >= new Date();

                      return (
                        <div
                          key={b.id}
                          className="bg-white rounded-2xl border border-primary-light/20 p-4 sm:p-5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <Link
                                  href={`/cursos/${b.courseSession.course.slug}`}
                                  className="text-sm font-bold text-warm-gray hover:text-primary transition-colors"
                                >
                                  {b.courseSession.course.title}
                                </Link>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bst.color}`}>
                                  {bst.label}
                                </span>
                                {isVirtual && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                                    Virtual
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-2">
                                <span className="flex items-center gap-1">
                                  <FiCalendar size={11} />
                                  {sessionDate.toLocaleDateString("es-UY", {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                  })}
                                </span>
                                <span>
                                  {b.courseSession.startTime} - {b.courseSession.endTime}
                                </span>
                                {b.courseSession.instructorName && (
                                  <span>con {b.courseSession.instructorName}</span>
                                )}
                                {!isVirtual && (
                                  <span className="flex items-center gap-1">
                                    <FiMapPin size={11} />
                                    Presencial
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {isVirtual && isPaid && isUpcoming && b.courseSession.meetingUrl && (
                            <div className="mt-3 pt-3 border-t border-primary-light/20">
                              <a
                                href={b.courseSession.meetingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-blue-600 transition-all shadow-sm hover:shadow-md"
                              >
                                <FiVideo size={15} />
                                Unirme a la reunión
                              </a>
                            </div>
                          )}

                          {isVirtual && isPaid && isUpcoming && !b.courseSession.meetingUrl && (
                            <div className="mt-3 pt-3 border-t border-primary-light/20">
                              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                                <FiVideo size={12} />
                                El link de la reunión estará disponible próximamente
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {bookings.filter((b) => b.status === "CANCELLED").length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">
                    Cancelados
                  </h3>
                  <div className="space-y-2">
                    {bookings
                      .filter((b) => b.status === "CANCELLED")
                      .map((b) => (
                        <div
                          key={b.id}
                          className="bg-white/60 rounded-xl border border-gray-200 p-4 opacity-60"
                        >
                          <p className="text-sm text-gray-500 line-through">
                            {b.courseSession.course.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(b.courseSession.date).toLocaleDateString("es-UY")} ·{" "}
                            {b.courseSession.startTime}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
