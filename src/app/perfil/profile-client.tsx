"use client";
import { api } from "@/lib/public-api";

import { useState, useEffect, useRef, useCallback } from "react";
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
  FiShield,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Image from "next/image";
import { resolveMediaPath, isLocalUploadPath } from "@/lib/image-url";
import Button from "@/components/ui/button";

interface Order {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  shippingName: string | null;
  items: { productName: string; quantity: number; price: number; variant: string | null }[];
}

interface OnlineEnrollment {
  id: string;
  progress: number;
  lastLessonId: string | null;
  onlineCourse: {
    title: string;
    slug: string;
    image: string | null;
    isPublished: boolean;
  };
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
  twoFactorEnabled?: boolean;
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
  files?: { fileName: string; index: number }[];
  orderId: string;
  purchasedAt: string;
}

export default function ProfileClient({
  user,
  orders,
  bookings,
  onlineEnrollments = [],
  admin2FARequired = false,
}: {
  user: UserData | null;
  orders: Order[];
  bookings: Booking[];
  /** Cursos online (compra / acceso) — mismo criterio que «Mi aprendizaje» */
  onlineEnrollments?: OnlineEnrollment[];
  /** Venís del panel admin sin 2FA: hay que activarlo antes de volver */
  admin2FARequired?: boolean;
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
  const [twoFAEnabled, setTwoFAEnabled] = useState(user?.twoFactorEnabled ?? false);
  const [twoFASetup, setTwoFASetup] = useState<{
    secret: string;
    qrBase64: string;
  } | null>(null);
  const [twoFAToken, setTwoFAToken] = useState("");
  const [twoFABusy, setTwoFABusy] = useState(false);
  const [twoFABackupCodes, setTwoFABackupCodes] = useState<string[] | null>(null);
  const twoFAAnchorRef = useRef<HTMLDivElement>(null);

  const startTwoFASetup = useCallback(async () => {
    setTwoFABusy(true);
    try {
      const res = await fetch(api("/api/auth/2fa/setup"), {
        method: "POST",
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error || "Error al iniciar configuración");
        return;
      }
      setTwoFASetup({
        secret: d.secret,
        qrBase64: d.qrBase64,
      });
    } catch {
      toast.error("Error de red");
    } finally {
      setTwoFABusy(false);
    }
  }, []);

  useEffect(() => {
    if (!admin2FARequired || twoFAEnabled || twoFASetup) return;
    setActiveTab("datos");
    const k =
      typeof window !== "undefined" && user?.id
        ? `karamba-admin-2fa-auto-${user.id}`
        : null;
    if (k && sessionStorage.getItem(k)) return;
    if (k) sessionStorage.setItem(k, "1");
    void startTwoFASetup();
  }, [
    admin2FARequired,
    twoFAEnabled,
    twoFASetup,
    user?.id,
    startTwoFASetup,
  ]);

  useEffect(() => {
    if (!admin2FARequired || !twoFASetup || !twoFAAnchorRef.current) return;
    twoFAAnchorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [admin2FARequired, twoFASetup]);

  useEffect(() => {
    fetch(api("/api/profile/digital-downloads"))
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
      const res = await fetch(api("/api/profile/password"), {
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
      await fetch(api("/api/profile"), {
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

  const onlinePublished = onlineEnrollments.filter(
    (e) => e.onlineCourse.isPublished
  );
  const cursosTabCount = bookings.length + onlinePublished.length;

  const tabs = [
    { id: "datos" as Tab, label: "Mis datos", icon: FiUser, count: null },
    { id: "ordenes" as Tab, label: "Pedidos", icon: FiPackage, count: orders.length },
    {
      id: "descargas" as Tab,
      label: "Mis descargas",
      icon: FiDownload,
      count: downloads.length,
    },
    { id: "cursos" as Tab, label: "Cursos", icon: FiBookOpen, count: cursosTabCount },
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
          {admin2FARequired && !twoFAEnabled && (
            <div className="mb-6 p-4 rounded-2xl border border-amber-200 bg-amber-50 text-sm text-amber-950">
              <p className="font-semibold text-amber-900 mb-1">
                Activá la verificación en dos pasos (obligatorio para administradores)
              </p>
              <p className="text-xs text-amber-800/90">
                El panel de administración solo se habilita después de vincular una app
                Authenticator (Google, Microsoft, etc.) escaneando el código QR que
                aparece abajo y confirmando con el código de 6 dígitos.
              </p>
            </div>
          )}
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

          <div
            ref={twoFAAnchorRef}
            id="seguridad-admin-2fa"
            className="mt-10 pt-8 border-t border-gray-100 scroll-mt-24"
          >
            <div className="flex items-center gap-2 mb-3">
              <FiShield className="text-primary" size={18} />
              <h3 className="font-bold text-warm-gray text-sm">
                Verificación en dos pasos (Authenticator)
              </h3>
            </div>
            <p className="text-xs text-gray-500 mb-4 max-w-xl">
              {admin2FARequired && !twoFAEnabled
                ? "Como administradora es obligatorio activar 2FA: escaneá el QR con tu app y confirmá con el código. Luego, en cada inicio de sesión te pediremos un código de la app además de la contraseña."
                : "Si sos administradora de Karamba y activás 2FA, al iniciar sesión te pediremos un código de la app Google Authenticator o Microsoft Authenticator además de la contraseña."}
            </p>

            {twoFABackupCodes && (
              <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm">
                <p className="font-semibold text-amber-900 mb-2">
                  Guardá estos códigos de respaldo (solo se muestran una vez):
                </p>
                <p className="text-xs text-amber-900/90 mb-2">
                  Cada código salvo el <strong>último de la lista</strong> se
                  invalida al usarlo una vez. El último no se gasta: seguís
                  pudiendo usarlo cuando lo necesites.
                </p>
                <ul className="font-mono text-xs text-amber-950 space-y-1">
                  {twoFABackupCodes.map((c, i) => (
                    <li key={c}>
                      {c}
                      {i === twoFABackupCodes.length - 1 ? (
                        <span className="ml-2 font-sans font-normal text-amber-800">
                          (permanente)
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="mt-3 text-xs font-semibold text-amber-800 underline"
                  onClick={() => setTwoFABackupCodes(null)}
                >
                  Ya los guardé
                </button>
              </div>
            )}

            {twoFAEnabled ? (
              <p className="text-sm text-green-700 font-medium">
                2FA activado en tu cuenta.
              </p>
            ) : !twoFASetup ? (
              <button
                type="button"
                disabled={twoFABusy}
                onClick={() => void startTwoFASetup()}
                className="px-4 py-2.5 rounded-xl bg-warm-gray text-white text-sm font-semibold hover:opacity-95 disabled:opacity-40"
              >
                {twoFABusy ? "…" : "Activar 2FA"}
              </button>
            ) : (
              <div className="space-y-4 max-w-md">
                <p className="text-xs text-gray-600">
                  Escaneá el código QR con tu app Authenticator y luego ingresá el
                  código de 6 dígitos para confirmar.
                </p>
                <div className="relative w-[220px] h-[220px] border border-gray-200 rounded-xl overflow-hidden bg-white">
                  <Image
                    src={twoFASetup.qrBase64}
                    alt="QR 2FA"
                    width={220}
                    height={220}
                    unoptimized
                    className="object-contain"
                  />
                </div>
                <p className="text-[10px] text-gray-400 font-mono break-all">
                  Si no podés escanear: secret manual (base32) — {twoFASetup.secret}
                </p>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Código de 6 dígitos
                  </label>
                  <input
                    value={twoFAToken}
                    onChange={(e) =>
                      setTwoFAToken(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono tracking-widest text-center"
                    placeholder="000000"
                    inputMode="numeric"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={twoFABusy || twoFAToken.length !== 6}
                    onClick={async () => {
                      setTwoFABusy(true);
                      try {
                        const res = await fetch(api("/api/auth/2fa/verify-setup"), {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            secret: twoFASetup.secret,
                            token: twoFAToken,
                          }),
                        });
                        const d = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          toast.error(d.error || "Código incorrecto");
                          return;
                        }
                        setTwoFABackupCodes(d.backupCodes || []);
                        setTwoFAEnabled(true);
                        setTwoFASetup(null);
                        setTwoFAToken("");
                        if (typeof window !== "undefined" && user?.id) {
                          sessionStorage.removeItem(
                            `karamba-admin-2fa-auto-${user.id}`
                          );
                        }
                        toast.success("2FA activado");
                      } catch {
                        toast.error("Error de red");
                      } finally {
                        setTwoFABusy(false);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-40"
                  >
                    Confirmar activación
                  </button>
                  <button
                    type="button"
                    disabled={twoFABusy}
                    onClick={() => {
                      setTwoFASetup(null);
                      setTwoFAToken("");
                    }}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
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
              {downloads.map((d) => {
                const fileLinks =
                  d.files?.length ?
                    d.files
                  : [{ fileName: d.fileName || "archivo", index: 0 }];
                return (
                  <div
                    key={d.productId}
                    className="bg-white rounded-2xl border border-primary-light/20 p-4 sm:p-5 flex flex-col gap-4"
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
                      <p className="text-[11px] text-gray-400 mt-1">
                        Compra del{" "}
                        {new Date(d.purchasedAt).toLocaleDateString("es-UY", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                      {fileLinks.map((f) => (
                        <a
                          key={`${d.productId}-${f.index}`}
                          href={api(
                            `/api/products/download?productId=${encodeURIComponent(d.productId)}&fileIndex=${f.index}`
                          )}
                          className="inline-flex items-center justify-center gap-2 shrink-0 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:opacity-95 transition-opacity"
                        >
                          <FiDownload size={16} />
                          <span className="truncate max-w-[200px]">
                            {f.fileName || "Descargar"}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
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
          {onlinePublished.length === 0 && bookings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-primary-light/30 p-12 text-center">
              <FiBookOpen size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 mb-4">
                No tenés cursos presenciales ni cursos online en tu cuenta.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center text-sm">
                <Link href="/cursos" className="text-primary font-medium hover:underline">
                  Cursos con fecha →
                </Link>
                <Link href="/cursos-online" className="text-primary font-medium hover:underline">
                  Cursos online →
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {onlinePublished.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-warm-gray mb-3 uppercase tracking-wider">
                    Cursos online
                  </h3>
                  <div className="space-y-3">
                    {onlinePublished.map((e) => {
                      const c = e.onlineCourse;
                      const img = c.image ? resolveMediaPath(c.image) : "";
                      return (
                        <div
                          key={e.id}
                          className="bg-white rounded-2xl border border-primary-light/20 p-4 sm:p-5 flex flex-col sm:flex-row gap-4"
                        >
                          <div className="relative w-full sm:w-40 aspect-video shrink-0 rounded-xl overflow-hidden bg-soft-gray">
                            {img ? (
                              <Image
                                src={img}
                                alt=""
                                fill
                                unoptimized={isLocalUploadPath(img)}
                                className="object-cover"
                                sizes="160px"
                              />
                            ) : null}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center gap-3">
                            <h4 className="font-display font-semibold text-warm-gray">
                              {c.title}
                            </h4>
                            <div className="h-2 rounded-full bg-gray-100 overflow-hidden max-w-md">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${Math.min(100, e.progress)}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-400">
                              {Math.round(e.progress)}% completado
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Link href={`/curso/${c.slug}/contenido`}>
                                <Button size="sm">
                                  {e.lastLessonId ? "Continuar" : "Empezar"}
                                </Button>
                              </Link>
                              <Link href={`/curso/${c.slug}`}>
                                <Button variant="outline" size="sm">
                                  Detalle
                                </Button>
                              </Link>
                              <Link href="/mi-aprendizaje">
                                <Button variant="ghost" size="sm">
                                  Mi aprendizaje
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {bookings.length > 0 && (
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
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
