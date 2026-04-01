"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/public-api";
import { formatPrice } from "@/lib/utils";

export function ProductShippingEstimate({
  productId,
  isDigital,
  isOnlineCourse,
}: {
  productId: string;
  isDigital: boolean;
  isOnlineCourse: boolean;
}) {
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    if (isDigital || isOnlineCourse) {
      setLine("Sin envío (contenido digital).");
      return;
    }
    let cancelled = false;
    fetch(
      api(
        `/api/shipping/public-estimate?productId=${encodeURIComponent(productId)}&departamento=${encodeURIComponent("Montevideo")}&city=&delivery=shipping`
      )
    )
      .then((r) => r.json())
      .then(
        (d: {
          skipPhysicalDelivery?: boolean;
          pendingManualQuote?: boolean;
          cost?: number;
        }) => {
          if (cancelled) return;
          if (d.skipPhysicalDelivery) setLine("Sin envío físico.");
          else if (d.pendingManualQuote)
            setLine(
              "Al interior el costo depende de tu ciudad; te lo confirmamos al comprar."
            );
          else if (typeof d.cost === "number")
            setLine(
              `Ejemplo Montevideo (envío estándar): ${formatPrice(d.cost)}.`
            );
          else setLine(null);
        }
      )
      .catch(() => {
        if (!cancelled) setLine(null);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, isDigital, isOnlineCourse]);

  if (!line) return null;

  return (
    <div className="mt-4 p-3.5 rounded-xl bg-accent-light/25 border border-accent/15 text-sm text-accent-dark leading-relaxed">
      <span className="font-semibold text-warm-gray">Envío estimado. </span>
      {line}
    </div>
  );
}
