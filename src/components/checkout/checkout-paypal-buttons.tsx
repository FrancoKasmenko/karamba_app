"use client";

import { api } from "@/lib/public-api";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

type Props = {
  clientId: string;
  /** Moneda del SDK PayPal (debe coincidir con la orden en el servidor). */
  currency: string;
  disabled: boolean;
  getPayload: () => Record<string, unknown>;
  onSuccess: (internalOrderId: string) => void;
  /** En el resumen del pedido: sin margen superior extra (lo da el contenedor). */
  summary?: boolean;
  className?: string;
};

type PayPalButtonsHandle = {
  render: (el: HTMLElement) => Promise<void>;
  /** OBLIGATORIO al desmontar (React Strict Mode / cambio de deps); si no, el SDK lanza `paypal_js_sdk_v5_unhandled_exception`. */
  close?: () => void;
};

declare global {
  interface Window {
    paypal?: {
      Buttons: (opts: {
        style?: { layout?: string; label?: string; height?: number };
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID: string }) => Promise<void>;
        onCancel?: () => void;
        onError?: (err: unknown) => void;
      }) => PayPalButtonsHandle;
    };
  }
}

export function CheckoutPayPalButtons({
  clientId,
  currency,
  disabled,
  getPayload,
  onSuccess,
  summary = false,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const internalOrderIdRef = useRef<string | null>(null);
  const getPayloadRef = useRef(getPayload);
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    getPayloadRef.current = getPayload;
    onSuccessRef.current = onSuccess;
  }, [getPayload, onSuccess]);

  // Cargar el SDK en cuanto hay client-id (no depender de `disabled`): si no, al validar el formulario
  // el script nunca se pedía y el botón no aparecía.
  useEffect(() => {
    if (!clientId) return;
    const param = `${encodeURIComponent(clientId)}_${encodeURIComponent(currency)}_card`;
    const scriptId = `paypal-sdk-${param.replace(/[^a-zA-Z0-9_]/g, "_")}`;
    const existing = document.getElementById(scriptId);
    if (existing) {
      setSdkReady(true);
      return;
    }
    const s = document.createElement("script");
    s.id = scriptId;
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&intent=capture&components=buttons&enable-funding=card`;
    s.async = true;
    s.onload = () => setSdkReady(true);
    s.onerror = () => toast.error("No se pudo cargar el script de PayPal");
    document.body.appendChild(s);
  }, [clientId, currency]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    let buttons: PayPalButtonsHandle | null = null;

    if (!disabled && sdkReady && clientId && window.paypal) {
      el.innerHTML = "";
      internalOrderIdRef.current = null;

      buttons = window.paypal.Buttons({
        style: { layout: "vertical", label: "paypal", height: 48 },
        createOrder: async () => {
          const body = getPayloadRef.current();
          const res = await fetch(api("/api/payments/paypal/create-order"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            orderId?: string;
            paypalOrderId?: string;
          };
          if (!res.ok) {
            toast.error(data.error || "Error al iniciar pago con PayPal");
            throw new Error(data.error || "paypal create");
          }
          if (!data.paypalOrderId) {
            toast.error("Respuesta inválida del servidor");
            throw new Error("missing paypalOrderId");
          }
          internalOrderIdRef.current = data.orderId ?? null;
          return data.paypalOrderId;
        },
        onApprove: async (data) => {
          const oid = internalOrderIdRef.current;
          if (!oid) {
            toast.error("No se encontró la orden interna. Probá de nuevo.");
            return;
          }
          const res = await fetch(api("/api/payments/paypal/capture-order"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: oid,
              paypalOrderId: data.orderID,
            }),
          });
          const cap = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          if (!res.ok) {
            toast.error(cap.error || "No se pudo confirmar el pago");
            return;
          }
          onSuccessRef.current(oid);
        },
        onCancel: () => {
          /* Evita ruido en consola cuando el comprador cierra la ventana de PayPal */
        },
        onError: (err) => {
          console.error("[PayPal SDK]", err);
          toast.error("Error en el flujo de PayPal");
        },
      });

      void buttons.render(el).catch((err) => {
        console.error("[PayPal] render", err);
        toast.error("No se pudo mostrar el botón de PayPal");
      });
    } else {
      el.innerHTML = "";
    }

    return () => {
      try {
        buttons?.close?.();
      } catch {
        /* teardown del SDK */
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [sdkReady, clientId, currency, disabled]);

  if (!clientId) return null;

  return (
    <div
      className={cn(
        "min-h-[52px] w-full",
        summary ? "mt-0" : "mt-3",
        className
      )}
    >
      <p className="text-xs text-gray-500 mb-2">
        {summary
          ? "Pagá con tu cuenta PayPal o con tarjeta de débito o crédito (flujo seguro de PayPal)."
          : "Al pagar se abre la ventana segura de PayPal."}
      </p>
      {disabled && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
          Completá los datos obligatorios del formulario (contacto y, si elegiste
          envío a domicilio, dirección) para que aparezcan los botones de pago.
        </p>
      )}
      <div ref={containerRef} className="paypal-buttons-host [&_iframe]:max-w-full" />
    </div>
  );
}
