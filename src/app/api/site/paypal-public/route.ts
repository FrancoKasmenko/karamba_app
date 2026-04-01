import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { payPalSdkCurrencyForSite } from "@/lib/paypal-server";

/** Client-id y flags para cargar el SDK (sin secretos). */
export async function GET() {
  const s = await prisma.siteSettings.findUnique({ where: { id: "main" } });
  const enabled = Boolean(s?.paypalEnabled && (s.paypalClientId ?? "").trim());
  const clientId = enabled ? (s!.paypalClientId ?? "").trim() : "";
  const siteCurrency = ((s?.paypalCurrency ?? "UYU").trim() || "UYU").toUpperCase();
  /** Debe coincidir con la moneda de la orden en PayPal (ej. UYU en tienda → USD en API). */
  const currency = await payPalSdkCurrencyForSite(siteCurrency);
  const env =
    (s?.paypalEnvironment ?? "sandbox").toLowerCase() === "live"
      ? "live"
      : "sandbox";

  return NextResponse.json({
    enabled,
    clientId: enabled ? clientId : null,
    currency,
    environment: env,
  });
}
