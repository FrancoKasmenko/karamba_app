"use client";
import { api } from "@/lib/public-api";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiCheckCircle, FiClock, FiMessageCircle } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

function SuccessContent() {
  const searchParams = useSearchParams();
  const { status: sessionStatus } = useSession();
  const confirmSent = useRef(false);

  const bookingId = searchParams.get("bookingId");
  const orderId = searchParams.get("orderId");
  const pending = searchParams.get("pending");
  const paymentId =
    searchParams.get("payment_id") || searchParams.get("collection_id") || "";
  const collectionStatus = searchParams.get("collection_status");
  const statusParam = searchParams.get("status");
  const mpSaysApproved =
    collectionStatus === "approved" || statusParam === "approved";

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    if (!orderId || !paymentId || pending === "true" || !mpSaysApproved) return;
    if (confirmSent.current) return;
    confirmSent.current = true;

    fetch(api("/api/payments/mercadopago-confirm"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, paymentId }),
    }).catch(() => {
      confirmSent.current = false;
    });
  }, [sessionStatus, orderId, paymentId, pending, mpSaysApproved]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full bg-white rounded-3xl shadow-xl border border-primary-light/30 p-8 text-center"
      >
        {pending ? (
          <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <FiClock size={32} className="text-yellow-500" />
          </div>
        ) : (
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <FiCheckCircle size={32} className="text-green-500" />
          </div>
        )}

        <h1 className="text-2xl font-extrabold text-warm-gray mb-2">
          {pending ? "Pago pendiente" : "¡Reserva confirmada!"}
        </h1>

        <p className="text-gray-500 mb-6">
          {pending
            ? "Tu pago está siendo procesado. Te notificaremos cuando se confirme."
            : "Tu lugar está asegurado. ¡Nos vemos pronto!"}
        </p>

        {(bookingId || orderId) && (
          <div className="bg-soft-gray rounded-xl p-4 mb-6 space-y-3 text-left">
            {bookingId && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Reserva</p>
                <p className="font-mono text-sm text-warm-gray break-all">{bookingId}</p>
              </div>
            )}
            {orderId && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Orden de pago</p>
                <p className="font-mono text-sm text-warm-gray break-all">
                  #{orderId.slice(-8).toUpperCase()}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="bg-primary-light/10 rounded-xl p-5 mb-6 text-left">
          <h3 className="font-semibold text-warm-gray mb-3 flex items-center gap-2">
            <FiMessageCircle size={16} />
            Próximos pasos
          </h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>✅ Tu lugar queda reservado automáticamente</li>
            <li>📱 Te contactaremos por WhatsApp para coordinar detalles</li>
            <li>📧 Revisá tu email para la confirmación</li>
            <li>📌 Si no recibís confirmación en 24hs, escribinos</li>
          </ul>
        </div>

        <a
          href="https://wa.me/59897629629?text=Hola! Acabo de reservar un curso 🎨"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-green-500 text-white font-semibold px-6 py-3 rounded-full hover:bg-green-600 transition-all mb-4 w-full justify-center"
        >
          <FaWhatsapp size={18} />
          Contactar por WhatsApp
        </a>

        <Link
          href="/cursos"
          className="block text-sm text-primary font-medium hover:underline"
        >
          ← Volver a cursos
        </Link>
      </motion.div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
