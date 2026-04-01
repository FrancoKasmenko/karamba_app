"use client";

import { api } from "@/lib/public-api";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FiCheckCircle,
  FiClock,
  FiPackage,
  FiMessageCircle,
  FiShoppingBag,
  FiDownload,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import Button from "@/components/ui/button";
import { trackAnalytics } from "@/lib/analytics-client";

interface DigitalRow {
  productId: string;
  productName: string;
  slug: string;
  fileName: string | null;
  canDownload: boolean;
  files: { fileName: string; index: number }[];
}

function SuccessContent() {
  const params = useSearchParams();
  const { status: sessionStatus } = useSession();
  const confirmSent = useRef(false);
  const purchaseTracked = useRef(false);
  const [digital, setDigital] = useState<DigitalRow[]>([]);
  const [digitalLoading, setDigitalLoading] = useState(false);
  const [onlineCourseOnly, setOnlineCourseOnly] = useState(false);

  const orderId = params.get("orderId") || "";
  const collectionStatus = params.get("collection_status");
  const statusParam = params.get("status");
  const status =
    statusParam || collectionStatus || "approved";
  const paymentId = params.get("payment_id") || params.get("collection_id") || "";
  const isPending =
    params.get("pending") === "true" || status === "pending";
  const isApproved = status === "approved";
  const mpSaysApproved =
    collectionStatus === "approved" || statusParam === "approved";

  const shortOrderId = orderId ? orderId.slice(-8).toUpperCase() : "";

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    if (!orderId || !paymentId || isPending || !mpSaysApproved) return;
    if (confirmSent.current) return;
    confirmSent.current = true;

    fetch(api("/api/payments/mercadopago-confirm"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, paymentId }),
    }).catch(() => {
      confirmSent.current = false;
    });
  }, [sessionStatus, orderId, paymentId, isPending, mpSaysApproved]);

  useEffect(() => {
    if (!orderId || sessionStatus !== "authenticated") return;
    if (purchaseTracked.current) return;
    purchaseTracked.current = true;
    void fetch(api(`/api/orders/${orderId}/summary`))
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { total?: number } | null) => {
        trackAnalytics({
          type: "purchase",
          metadata: {
            orderId,
            value: typeof d?.total === "number" ? d.total : undefined,
            currency: "UYU",
            channel: "mercadopago_success",
          },
        });
      })
      .catch(() => {
        trackAnalytics({
          type: "purchase",
          metadata: { orderId, currency: "UYU", channel: "mercadopago_success" },
        });
      });
  }, [orderId, sessionStatus]);

  useEffect(() => {
    if (!orderId || sessionStatus !== "authenticated") {
      setDigital([]);
      setDigitalLoading(false);
      return;
    }
    let cancelled = false;
    setDigitalLoading(true);
    fetch(api(`/api/orders/${orderId}/digital-summary`))
      .then((r) => (r.ok ? r.json() : { digital: [] }))
      .then(
        (data: {
          digital?: DigitalRow[];
          onlineCourseOnly?: boolean;
        }) => {
          if (!cancelled) {
            setDigital(Array.isArray(data.digital) ? data.digital : []);
            setOnlineCourseOnly(data.onlineCourseOnly === true);
          }
        }
      )
      .catch(() => {
        if (!cancelled) setDigital([]);
      })
      .finally(() => {
        if (!cancelled) setDigitalLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, sessionStatus]);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        {isApproved ? (
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <FiCheckCircle size={40} className="text-green-500" />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-full bg-accent-light flex items-center justify-center mx-auto mb-5">
            <FiClock size={40} className="text-accent-dark" />
          </div>
        )}

        <h1 className="font-display text-3xl sm:text-4xl font-bold text-warm-gray mb-3">
          {isApproved
            ? "¡Pago exitoso!"
            : isPending
              ? "Pago en proceso"
              : "Pedido registrado"}
        </h1>

        <p className="text-gray-500 text-lg">
          {isApproved
            ? "Tu pago fue aprobado correctamente"
            : "Tu pago está siendo procesado"}
        </p>
      </motion.div>

      {/* Order details */}
      {(shortOrderId || paymentId) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 mb-6 shadow-sm"
        >
          <h2 className="font-bold text-warm-gray text-sm mb-3 uppercase tracking-wider">
            Datos de tu compra
          </h2>
          <div className="space-y-2">
            {shortOrderId && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Nº de orden</span>
                <span className="font-mono font-semibold text-warm-gray">
                  #{shortOrderId}
                </span>
              </div>
            )}
            {paymentId && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">ID de pago</span>
                <span className="font-mono text-gray-600">{paymentId}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Estado</span>
              <span
                className={`font-semibold ${isApproved ? "text-green-600" : "text-accent-dark"}`}
              >
                {isApproved ? "Aprobado" : isPending ? "Pendiente" : "En proceso"}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {orderId &&
        sessionStatus === "authenticated" &&
        !digitalLoading &&
        digital.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl border border-violet-100 p-5 sm:p-6 mb-6 shadow-sm"
          >
            <h2 className="font-bold text-warm-gray text-sm mb-3 uppercase tracking-wider flex items-center gap-2">
              <FiDownload className="text-violet-600" size={16} />
              Productos descargables
            </h2>
            <div className="space-y-3">
              {digital.map((row) => {
                const fileLinks =
                  row.files?.length ?
                    row.files
                  : [{ fileName: row.fileName || "archivo", index: 0 }];
                return (
                  <div
                    key={row.productId}
                    className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-violet-50/40 p-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-warm-gray truncate">
                        {row.productName}
                      </p>
                      {!row.canDownload && (
                        <p className="text-xs text-amber-700 mt-1">
                          La descarga se habilita cuando el pago quede confirmado en
                          el sistema.
                        </p>
                      )}
                    </div>
                    {row.canDownload ?
                      <div className="flex flex-col gap-2">
                        {fileLinks.map((f) => (
                          <a
                            key={`${row.productId}-${f.index}`}
                            href={api(
                              `/api/products/download?productId=${encodeURIComponent(row.productId)}&fileIndex=${f.index}`
                            )}
                            className="inline-flex items-center justify-center gap-2 shrink-0 rounded-full bg-violet-600 text-white text-sm font-semibold px-5 py-2.5 hover:bg-violet-700 transition-colors"
                          >
                            <FiDownload size={16} />
                            <span className="truncate max-w-full">
                              Descargar{f.fileName ? `: ${f.fileName}` : ""}
                            </span>
                          </a>
                        ))}
                      </div>
                    : <span className="text-xs text-gray-400">
                        Podés volver cuando el estado sea &quot;Pagado&quot;
                      </span>
                    }
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

      {/* Next steps */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 mb-6 shadow-sm"
      >
        <h2 className="font-bold text-warm-gray text-sm mb-4 uppercase tracking-wider">
          Próximos pasos
        </h2>
        {onlineCourseOnly ? (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-light/40 flex items-center justify-center shrink-0">
                <FiCheckCircle size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-warm-gray">
                  Acceso a tu curso
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Cuando el pago quede confirmado, el curso aparece en{" "}
                  <strong>Mi aprendizaje</strong> con todas las clases y
                  materiales. No hay envío ni retiro.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <FiMessageCircle size={16} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-warm-gray">
                  ¿Dudas con el acceso?
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Escribinos por WhatsApp y te ayudamos a entrar al aula.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <FiMessageCircle size={16} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-warm-gray">
                  Te contactaremos por WhatsApp
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Dentro de las próximas 24 hs nos comunicamos para coordinar la
                  entrega de tu pedido.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-light/40 flex items-center justify-center shrink-0">
                <FiPackage size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-warm-gray">
                  Preparamos tu pedido
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Algunos productos pueden estar disponibles de inmediato. Otros
                  requieren un plazo de producción de ~7 días hábiles.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-light/50 flex items-center justify-center shrink-0">
                <FiShoppingBag size={16} className="text-accent-dark" />
              </div>
              <div>
                <p className="text-sm font-semibold text-warm-gray">
                  Envío o retiro
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Si elegiste envío, te avisamos cuando esté despachado con
                  seguimiento. Si elegiste retiro, coordinamos para que vengas.
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Important notice */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl bg-mint/15 border border-mint/30 p-5 mb-8"
      >
        <div className="flex items-start gap-3">
          <FaWhatsapp size={20} className="text-green-600 shrink-0 mt-0.5" />
          <div className="text-sm text-gray-600 leading-relaxed">
            <p>
              <strong className="text-green-700">
                ¿No recibiste noticias nuestras en 24 hs?
              </strong>
            </p>
            <p className="mt-1">
              Escribinos por WhatsApp al{" "}
              <a
                href="https://wa.me/59897629629"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-green-700 underline"
              >
                097 629 629
              </a>{" "}
              con los siguientes datos:
            </p>
            <ul className="mt-2 space-y-1 text-gray-500">
              <li>• Tu nombre y apellido</li>
              {shortOrderId && (
                <li>
                  • Número de orden:{" "}
                  <span className="font-mono font-semibold text-warm-gray">
                    #{shortOrderId}
                  </span>
                </li>
              )}
              <li>• Comprobante de pago (si corresponde)</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-3 justify-center"
      >
        <Link href="/productos">
          <Button size="lg" className="w-full sm:w-auto">
            Seguir comprando
          </Button>
        </Link>
        <a
          href="https://wa.me/59897629629"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
          >
            <FaWhatsapp className="mr-2" />
            Consultar por WhatsApp
          </Button>
        </a>
      </motion.div>

      <p className="text-center text-xs text-gray-400 mt-8">
        Gracias por confiar en Karamba. Tu compra apoya un emprendimiento que
        apuesta al detalle y a la creatividad.
      </p>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
