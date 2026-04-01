"use client";

import { api } from "@/lib/public-api";
import { getAnalyticsSessionId } from "@/lib/analytics-session-client";

export const ANALYTICS_EVENT_TYPES = [
  "page_view",
  "view_item",
  "add_to_cart",
  "begin_checkout",
  "purchase",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

type TrackPayload = {
  type: AnalyticsEventType;
  productId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Envía un evento de analítica (fire-and-forget). El userId se resuelve en el servidor si hay sesión.
 */
export function trackAnalytics(payload: TrackPayload): void {
  if (typeof window === "undefined") return;

  const sessionId = getAnalyticsSessionId();
  if (!sessionId) return;

  const body = {
    type: payload.type,
    sessionId,
    ...(payload.productId ? { productId: payload.productId } : {}),
    metadata: payload.metadata ?? {},
  };

  void fetch(api("/api/analytics/track"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}
