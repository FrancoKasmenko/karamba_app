import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { prisma } from "@/lib/prisma";

const MAX_MP_MSG = 420;

/**
 * Mensaje legible devuelto por la API/SDK (para logs y respuesta al cliente, sin datos sensibles).
 */
export function describeMercadoPagoError(err: unknown): string {
  if (err == null) return "";
  if (typeof err === "string") return err.trim().slice(0, MAX_MP_MSG);

  if (typeof err === "object") {
    const o = err as Record<string, unknown>;

    const tryMsg = (v: unknown): string => {
      if (typeof v === "string" && v.trim()) return v.trim().slice(0, MAX_MP_MSG);
      return "";
    };

    const direct =
      tryMsg(o.message) ||
      tryMsg(o.description) ||
      tryMsg(o.error) ||
      tryMsg(o.status);
    if (direct) return direct;

    const cause = o.cause;
    if (cause && typeof cause === "object") {
      const c = cause as Record<string, unknown>;
      const fromCause =
        tryMsg(c.message) ||
        tryMsg(c.description) ||
        tryMsg((c.body as Record<string, unknown>)?.message) ||
        tryMsg((c.body as Record<string, unknown>)?.error);
      if (fromCause) return fromCause;
    }

    const response = o.response as Record<string, unknown> | undefined;
    const data = response?.data as Record<string, unknown> | undefined;
    if (data) {
      const fromData =
        tryMsg(data.message) ||
        tryMsg(data.error) ||
        tryMsg(data.cause);
      if (fromData) return fromData;
      const causes = data.cause;
      if (Array.isArray(causes) && causes[0] && typeof causes[0] === "object") {
        const d = (causes[0] as Record<string, unknown>).description;
        const m = tryMsg(d);
        if (m) return m;
      }
    }
  }

  if (err instanceof Error && err.message) {
    return err.message.slice(0, MAX_MP_MSG);
  }

  return "";
}

export async function getMercadoPagoClient() {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "main" },
  });

  if (!settings?.mercadoPagoAccessToken || !settings.mercadoPagoEnabled) {
    return null;
  }

  return new MercadoPagoConfig({
    accessToken: settings.mercadoPagoAccessToken,
  });
}

export { Preference, Payment };
