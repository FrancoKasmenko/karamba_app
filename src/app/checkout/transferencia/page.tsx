"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { FiUpload, FiCheck, FiExternalLink, FiPackage } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { formatPrice } from "@/lib/utils";
import { resolveMediaPath } from "@/lib/image-url";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";
import BankLogo from "@/components/ui/bank-logo";

interface Summary {
  id: string;
  total: number;
  status: string;
  checkoutPaymentMethod: string;
  transferReceiptUrl: string | null;
  transferReceiptStatus: string;
  transferReceiptAt: string | null;
  transferAccount: {
    holderName: string;
    accountNumber: string;
    bankName: string;
    bankKey: string;
  } | null;
}

function TransferContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId") || "";
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    fetch(`/api/orders/${orderId}/summary`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setSummary(null);
        else setSummary(d);
      })
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orderId) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`/api/orders/${orderId}/transfer-receipt`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Comprobante recibido");
      setSummary((s) =>
        s
          ? {
              ...s,
              transferReceiptUrl: data.transferReceiptUrl,
              transferReceiptStatus: data.transferReceiptStatus,
              transferReceiptAt: data.transferReceiptAt,
            }
          : s
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir");
    }
    setUploading(false);
    e.target.value = "";
  };

  if (!orderId) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center px-4">
        <p className="text-gray-500">Falta el número de orden.</p>
        <Link href="/checkout" className="text-primary font-semibold mt-4">
          Volver al checkout
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!summary || summary.checkoutPaymentMethod !== "BANK_TRANSFER") {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center px-4">
        <p className="text-gray-500">Pedido no encontrado o no es por transferencia.</p>
        <Link href="/perfil" className="text-primary font-semibold mt-4">
          Mi cuenta
        </Link>
      </div>
    );
  }

  const acc = summary.transferAccount;
  const hasReceipt =
    summary.transferReceiptUrl && summary.transferReceiptStatus !== "NONE";

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-primary-light/35 shadow-lg p-6 sm:p-8"
      >
        <div className="flex justify-center mb-6">
          <Image
            src="/no-image.png"
            alt="Karamba"
            width={140}
            height={48}
            className="h-10 w-auto object-contain"
          />
        </div>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary-light/50 text-secondary-dark mb-3">
            <FiPackage size={26} />
          </div>
          <h1 className="text-xl font-extrabold text-warm-gray">
            Pedido registrado
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Transferí el total y envianos el comprobante
          </p>
          <p className="text-xs font-mono text-primary-dark mt-2">
            Orden #{orderId.slice(-8).toUpperCase()}
          </p>
          <p className="text-lg font-extrabold text-primary-dark mt-1">
            {formatPrice(summary.total)}
          </p>
        </div>

        {acc && (
          <div className="rounded-2xl border border-primary-light/40 bg-cream/40 p-4 mb-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
              Cuenta elegida
            </p>
            <div className="flex gap-3 items-start">
              <BankLogo bankKey={acc.bankKey} bankName={acc.bankName} />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-warm-gray text-sm">{acc.bankName}</p>
                <p className="text-sm text-gray-600">{acc.holderName}</p>
                <p className="text-sm font-mono font-semibold text-primary-dark mt-1 break-all">
                  {acc.accountNumber}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-bold text-warm-gray uppercase tracking-wide block mb-2">
              Subir comprobante
            </span>
            <div className="relative">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFile}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="flex items-center justify-center gap-2 px-4 py-4 rounded-2xl border-2 border-dashed border-primary-light/60 bg-primary-light/10 text-primary-dark font-semibold text-sm hover:bg-primary-light/20 transition-colors">
                {uploading ? (
                  <span className="animate-pulse">Subiendo…</span>
                ) : (
                  <>
                    <FiUpload size={18} />
                    Imagen o PDF (máx. 5 MB)
                  </>
                )}
              </div>
            </div>
          </label>

          {hasReceipt && (
            <div className="rounded-xl bg-mint/20 border border-mint/40 p-3 flex items-start gap-2 text-sm text-green-800">
              <FiCheck className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Comprobante recibido</p>
                <p className="text-xs opacity-90">
                  Estado:{" "}
                  {summary.transferReceiptStatus === "VALIDATED"
                    ? "Validado"
                    : "Pendiente de revisión"}
                </p>
                {summary.transferReceiptUrl && (
                  <a
                    href={
                      resolveMediaPath(summary.transferReceiptUrl) ||
                      summary.transferReceiptUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-green-700 underline mt-1"
                  >
                    Ver archivo <FiExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-4 text-sm text-amber-900">
            <p className="font-semibold mb-1">¿No subiste comprobante?</p>
            <p className="text-amber-800/90 leading-relaxed">
              Podés enviar el comprobante por{" "}
              <strong>WhatsApp</strong> indicando tu número de orden.
            </p>
            <a
              href={`https://wa.me/59897629629?text=${encodeURIComponent(
                `Hola! Transferí por el pedido #${orderId.slice(-8).toUpperCase()}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 transition-colors"
            >
              <FaWhatsapp size={18} />
              Enviar por WhatsApp
            </a>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link href="/productos" className="flex-1">
            <Button variant="outline" className="w-full" size="lg">
              Seguir comprando
            </Button>
          </Link>
          <Link href="/perfil" className="flex-1">
            <Button className="w-full" size="lg">
              Mi cuenta
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function TransferenciaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <TransferContent />
    </Suspense>
  );
}
