"use client";
import { api } from "@/lib/public-api";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import {
  resolveProductImage,
  isLocalUploadPath,
  resolveMediaPath,
} from "@/lib/image-url";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiUser,
  FiMapPin,
  FiPhone,
  FiMail,
  FiEdit3,
  FiSave,
  FiX,
  FiDownload,
  FiCreditCard,
  FiPackage,
  FiFileText,
  FiRefreshCw,
  FiBook,
  FiImage,
  FiExternalLink,
} from "react-icons/fi";

interface OrderItem {
  id: string;
  itemType?: "PRODUCT" | "COURSE";
  productId: string | null;
  productName: string;
  variant: string | null;
  quantity: number;
  price: number;
  product: {
    images: string[];
    imageUrl?: string | null;
    slug: string;
    isDigital?: boolean;
    fileName?: string | null;
    fileUrl?: string | null;
  } | null;
  courseSession?: {
    id: string;
    date: string;
    course: { title: string; slug: string };
  } | null;
}

interface TransferAccount {
  id: string;
  holderName: string;
  accountNumber: string;
  bankName: string;
  bankKey: string;
}

interface Order {
  id: string;
  source?: "PRODUCT" | "COURSE";
  checkoutPaymentMethod?: "MERCADOPAGO" | "BANK_TRANSFER";
  transferReceiptUrl?: string | null;
  transferReceiptStatus?: "NONE" | "PENDING" | "VALIDATED";
  transferReceiptAt?: string | null;
  transferAccount?: TransferAccount | null;
  total: number;
  currency: string;
  status: string;
  paymentId: string | null;
  paymentProvider: string | null;
  shippingName: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingPhone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user: { name: string | null; email: string; phone: string | null };
  items: OrderItem[];
}

const statusOptions = [
  { value: "PENDING", label: "Pendiente", color: "bg-yellow-100 text-yellow-800" },
  { value: "PROCESSING", label: "Procesando", color: "bg-blue-100 text-blue-800" },
  { value: "PAID", label: "Pagado", color: "bg-green-100 text-green-800" },
  { value: "SHIPPED", label: "Enviado", color: "bg-purple-100 text-purple-800" },
  { value: "DELIVERED", label: "Entregado", color: "bg-emerald-100 text-emerald-800" },
  { value: "CANCELLED", label: "Cancelado", color: "bg-red-100 text-red-800" },
];

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [resending, setResending] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    shippingName: "",
    shippingAddress: "",
    shippingCity: "",
    shippingPhone: "",
    notes: "",
  });

  const fetchOrder = () => {
    fetch(api(`/api/admin/orders/${id}`))
      .then((r) => r.json())
      .then((data) => {
        setOrder(data);
        setEditForm({
          shippingName: data.shippingName || "",
          shippingAddress: data.shippingAddress || "",
          shippingCity: data.shippingCity || "",
          shippingPhone: data.shippingPhone || "",
          notes: data.notes || "",
        });
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(api(`/api/admin/orders/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      setOrder(data);
      toast.success("Estado actualizado");
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const res = await fetch(api(`/api/admin/orders/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      setOrder(data);
      setEditing(false);
      toast.success("Datos actualizados");
    } catch {
      toast.error("Error al guardar");
    }
    setSaving(false);
  };

  const handleTransferReceiptStatus = async (next: "PENDING" | "VALIDATED") => {
    try {
      const payload =
        next === "VALIDATED"
          ? { transferReceiptStatus: "VALIDATED" as const }
          : {
              transferReceiptStatus: "PENDING" as const,
              status: "PENDING" as const,
            };
      const res = await fetch(api(`/api/admin/orders/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setOrder(data);
      toast.success(
        next === "VALIDATED" ? "Comprobante validado y orden marcada como pagada" : "Estado actualizado"
      );
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const handleSyncPayment = async () => {
    setSyncing(true);
    try {
      const res = await fetch(api(`/api/admin/orders/${id}/sync-payment`), {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Estado sincronizado: ${data.newStatus}`);
        fetchOrder();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Error al sincronizar");
    }
    setSyncing(false);
  };

  const handleResendEmail = async (
    type:
      | "ORDER_CREATED"
      | "ORDER_PAID"
      | "ORDER_REJECTED"
      | "TRANSFER_REMINDER"
  ) => {
    setResending(type);
    try {
      const res = await fetch(api(`/api/admin/orders/${id}/resend-email`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (res.ok) toast.success("Email encolado / enviado");
      else toast.error(data.error || "Error");
    } catch {
      toast.error("Error al reenviar");
    }
    setResending(null);
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await fetch(api(`/api/orders/${id}/invoice`));
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `factura-${id.slice(-8).toUpperCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Factura descargada");
    } catch {
      toast.error("Error al generar factura");
    }
    setDownloadingPdf(false);
  };

  if (loading)
    return <div className="text-gray-400 py-10">Cargando orden...</div>;
  if (!order)
    return <div className="text-gray-400 py-10">Orden no encontrada</div>;

  const st =
    statusOptions.find((s) => s.value === order.status) || statusOptions[0];
  const subtotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shippingCost = Math.max(0, order.total - subtotal);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/ordenes")}
            className="p-2 rounded-lg text-gray-400 hover:text-warm-gray hover:bg-soft-gray transition-colors"
          >
            <FiArrowLeft size={18} />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold text-warm-gray">
                Orden #{order.id.slice(-8).toUpperCase()}
              </h1>
              {order.source === "COURSE" && (
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent-light/60 text-accent-dark">
                  Curso
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(order.createdAt).toLocaleDateString("es-UY", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
          >
            {downloadingPdf ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-1.5" />
                Generando...
              </>
            ) : (
              <>
                <FiDownload size={14} className="mr-1.5" />
                Factura PDF
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Products */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FiPackage size={16} className="text-primary" />
              <h2 className="font-bold text-warm-gray text-sm">
                {order.source === "COURSE" ? "Curso reservado" : "Productos"}
              </h2>
            </div>
            <div className="space-y-3">
              {order.items.map((item) => {
                const productThumbSrc = item.product
                  ? resolveProductImage({
                      imageUrl: item.product.imageUrl,
                      images: item.product.images,
                      id: item.productId ?? undefined,
                      name: item.productName,
                      slug: item.product.slug,
                    })
                  : "";
                return (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 rounded-xl bg-soft-gray/50"
                >
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    {item.product ? (
                      <Image
                        src={productThumbSrc}
                        alt={item.productName}
                        fill
                        unoptimized={isLocalUploadPath(productThumbSrc)}
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : item.itemType === "COURSE" || item.courseSession ? (
                      <div className="w-full h-full flex items-center justify-center text-accent-dark bg-accent-light/30">
                        <FiBook size={22} />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <FiPackage size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-semibold text-warm-gray truncate">
                        {item.productName}
                      </p>
                      {(item.itemType === "COURSE" || item.courseSession) && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-accent-light/50 text-accent-dark shrink-0">
                          Curso
                        </span>
                      )}
                      {item.product?.isDigital && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 shrink-0">
                          Descargable
                        </span>
                      )}
                    </div>
                    {item.variant && (
                      <p className="text-xs text-gray-400">{item.variant}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.quantity} × {formatPrice(item.price)}
                    </p>
                    {item.product?.isDigital && item.product.fileName && (
                      <p className="text-[11px] text-violet-700 mt-1 font-mono break-all">
                        Archivo: {item.product.fileName}
                        {item.product.fileUrl && (
                          <span className="block text-gray-400 font-sans mt-0.5">
                            {item.product.fileUrl}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-bold text-warm-gray shrink-0 self-center">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-700">{formatPrice(subtotal)}</span>
              </div>
              {shippingCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Envío</span>
                  <span className="text-gray-700">
                    {formatPrice(shippingCost)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-100">
                <span className="text-warm-gray">Total</span>
                <span className="text-primary-dark">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Customer & Shipping */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FiUser size={16} className="text-secondary-dark" />
                <h2 className="font-bold text-warm-gray text-sm">
                  Cliente y Envío
                </h2>
              </div>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-gray-400 hover:text-primary flex items-center gap-1 transition-colors"
                >
                  <FiEdit3 size={12} /> Editar
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
                  >
                    <FiSave size={12} /> {saving ? "Guardando..." : "Guardar"}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                  >
                    <FiX size={12} /> Cancelar
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 mb-1 block">
                    Nombre
                  </label>
                  <input
                    value={editForm.shippingName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, shippingName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 mb-1 block">
                    Teléfono
                  </label>
                  <input
                    value={editForm.shippingPhone}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        shippingPhone: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-primary outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-gray-500 mb-1 block">
                    Dirección
                  </label>
                  <input
                    value={editForm.shippingAddress}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        shippingAddress: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 mb-1 block">
                    Ciudad
                  </label>
                  <input
                    value={editForm.shippingCity}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        shippingCity: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 mb-1 block">
                    Notas
                  </label>
                  <input
                    value={editForm.notes}
                    onChange={(e) =>
                      setEditForm({ ...editForm, notes: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-primary outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <FiUser
                      size={14}
                      className="text-gray-400 mt-0.5 shrink-0"
                    />
                    <div>
                      <p className="text-sm font-medium text-warm-gray">
                        {order.shippingName || order.user.name || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <FiMail
                      size={14}
                      className="text-gray-400 mt-0.5 shrink-0"
                    />
                    <p className="text-sm text-gray-600">{order.user.email}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <FiPhone
                      size={14}
                      className="text-gray-400 mt-0.5 shrink-0"
                    />
                    <p className="text-sm text-gray-600">
                      {order.shippingPhone || order.user.phone || "—"}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <FiMapPin
                      size={14}
                      className="text-gray-400 mt-0.5 shrink-0"
                    />
                    <div>
                      <p className="text-sm text-gray-600">
                        {order.shippingAddress || "—"}
                      </p>
                      {order.shippingCity && (
                        <p className="text-xs text-gray-400">
                          {order.shippingCity}
                        </p>
                      )}
                    </div>
                  </div>
                  {order.notes && (
                    <div className="flex items-start gap-2">
                      <FiFileText
                        size={14}
                        className="text-gray-400 mt-0.5 shrink-0"
                      />
                      <p className="text-sm text-gray-500 italic">
                        {order.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-bold text-warm-gray text-sm mb-3">Estado</h3>
            <span
              className={`inline-flex text-xs font-semibold px-3 py-1.5 rounded-full mb-4 ${st.color}`}
            >
              {st.label}
            </span>
            <select
              value={order.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-primary outline-none"
            >
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <FiCreditCard size={14} className="text-accent-dark" />
              <h3 className="font-bold text-warm-gray text-sm">Pago</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-gray-500 shrink-0">Método</span>
                <span className="text-gray-700 text-right font-medium">
                  {order.checkoutPaymentMethod === "BANK_TRANSFER"
                    ? "Transferencia"
                    : "Mercado Pago"}
                </span>
              </div>
              {order.checkoutPaymentMethod === "BANK_TRANSFER" &&
                order.transferAccount && (
                  <div className="text-xs text-gray-600 bg-soft-gray/60 rounded-lg p-2.5 space-y-0.5">
                    <p className="font-semibold text-warm-gray">
                      {order.transferAccount.bankName}
                    </p>
                    <p>{order.transferAccount.holderName}</p>
                    <p className="font-mono text-primary-dark">
                      {order.transferAccount.accountNumber}
                    </p>
                  </div>
                )}
              <div className="flex justify-between">
                <span className="text-gray-500">Proveedor</span>
                <span className="text-gray-700 capitalize">
                  {order.paymentProvider || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ID de pago</span>
                <span className="text-gray-700 font-mono text-xs">
                  {order.paymentId || "—"}
                </span>
              </div>
            </div>
            {order.checkoutPaymentMethod === "BANK_TRANSFER" && (
              <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-warm-gray uppercase tracking-wide">
                  <FiImage size={12} />
                  Comprobante
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
                      order.transferReceiptStatus === "VALIDATED"
                        ? "bg-green-100 text-green-800"
                        : order.transferReceiptStatus === "PENDING"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {order.transferReceiptStatus === "VALIDATED"
                      ? "Validado"
                      : order.transferReceiptStatus === "PENDING"
                        ? "Pendiente"
                        : "Sin archivo"}
                  </span>
                </div>
                {order.transferReceiptUrl && (
                  <a
                    href={
                      resolveMediaPath(order.transferReceiptUrl) ||
                      order.transferReceiptUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    Ver comprobante <FiExternalLink size={12} />
                  </a>
                )}
                {order.transferReceiptStatus === "PENDING" && (
                  <button
                    type="button"
                    onClick={() => handleTransferReceiptStatus("VALIDATED")}
                    className="w-full mt-1 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 py-2 rounded-lg transition-colors"
                  >
                    Validar comprobante (marcar orden pagada)
                  </button>
                )}
                {order.transferReceiptStatus === "VALIDATED" && (
                  <button
                    type="button"
                    onClick={() => handleTransferReceiptStatus("PENDING")}
                    className="w-full mt-1 text-xs font-medium text-gray-600 bg-soft-gray py-2 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Revertir a pendiente
                  </button>
                )}
              </div>
            )}
            {order.paymentId && order.checkoutPaymentMethod !== "BANK_TRANSFER" && (
              <button
                onClick={handleSyncPayment}
                disabled={syncing}
                className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-primary font-medium px-3 py-2 rounded-lg bg-primary-light/20 hover:bg-primary-light/40 transition-colors"
              >
                <FiRefreshCw
                  size={12}
                  className={syncing ? "animate-spin" : ""}
                />
                {syncing ? "Sincronizando..." : "Sincronizar con MercadoPago"}
              </button>
            )}
          </div>

          {/* Reenvío de emails */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <FiMail size={14} className="text-primary" />
              <h3 className="font-bold text-warm-gray text-sm">Emails</h3>
            </div>
            <p className="text-[11px] text-gray-400 mb-3">
              Reenviar notificaciones (no duplica si ya hubo éxito salvo forzar
              clave nueva).
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={!!resending}
                onClick={() => void handleResendEmail("ORDER_CREATED")}
                className="text-left text-xs font-medium px-3 py-2 rounded-lg bg-soft-gray/60 hover:bg-soft-gray text-warm-gray disabled:opacity-50"
              >
                {resending === "ORDER_CREATED" ? "…" : null} Pedido recibido
              </button>
              <button
                type="button"
                disabled={!!resending}
                onClick={() => void handleResendEmail("ORDER_PAID")}
                className="text-left text-xs font-medium px-3 py-2 rounded-lg bg-soft-gray/60 hover:bg-soft-gray text-warm-gray disabled:opacity-50"
              >
                {resending === "ORDER_PAID" ? "…" : null} Pago confirmado
              </button>
              <button
                type="button"
                disabled={!!resending}
                onClick={() => void handleResendEmail("ORDER_REJECTED")}
                className="text-left text-xs font-medium px-3 py-2 rounded-lg bg-soft-gray/60 hover:bg-soft-gray text-warm-gray disabled:opacity-50"
              >
                {resending === "ORDER_REJECTED" ? "…" : null} Pago rechazado /
                cancelado
              </button>
              {order.checkoutPaymentMethod === "BANK_TRANSFER" && (
                <button
                  type="button"
                  disabled={!!resending}
                  onClick={() => void handleResendEmail("TRANSFER_REMINDER")}
                  className="text-left text-xs font-medium px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 disabled:opacity-50"
                >
                  {resending === "TRANSFER_REMINDER" ? "…" : null} Recordatorio
                  transferencia
                </button>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-bold text-warm-gray text-sm mb-3">
              Historial
            </h3>
            <div className="space-y-3 text-xs text-gray-500">
              <div className="flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                <div>
                  <p>Creada</p>
                  <p className="text-gray-400">
                    {new Date(order.createdAt).toLocaleString("es-UY")}
                  </p>
                </div>
              </div>
              {order.updatedAt !== order.createdAt && (
                <div className="flex gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <p>Última actualización</p>
                    <p className="text-gray-400">
                      {new Date(order.updatedAt).toLocaleString("es-UY")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
