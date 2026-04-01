import { getBrouMaxUyuPerUsdCached } from "@/lib/brou-usd-uyu";
import { prisma } from "@/lib/prisma";
import { roundMoney } from "@/lib/product-pricing";

export type PayPalEnv = "sandbox" | "live";

/** Monedas admitidas por PayPal Checkout (Orders v2). UYU y otras no listadas requieren puente a USD. */
const PAYPAL_CHECKOUT_SUPPORTED = new Set(
  [
    "AUD",
    "BRL",
    "CAD",
    "CNY",
    "CZK",
    "DKK",
    "EUR",
    "HKD",
    "HUF",
    "ILS",
    "JPY",
    "MYR",
    "MXN",
    "TWD",
    "NZD",
    "NOK",
    "PHP",
    "PLN",
    "GBP",
    "RUB",
    "SGD",
    "SEK",
    "CHF",
    "THB",
    "USD",
  ].map((c) => c.toUpperCase())
);

export type PayPalCurrencyResolution = {
  /** Código ISO enviado a PayPal (SDK + Orders API). */
  paypalCurrencyCode: string;
  /** Convierte un monto en `siteCurrency` al monto en `paypalCurrencyCode`. */
  convertAmount: (amountSite: number) => number;
};

async function uyuPerUsdForPayPal(): Promise<number> {
  const brou = await getBrouMaxUyuPerUsdCached();
  if (brou != null) return brou;
  const env = Number(process.env.PAYPAL_UYU_PER_USD ?? "");
  if (Number.isFinite(env) && env > 0) return env;
  console.warn(
    "[PayPal] Sin cotización BROU ni PAYPAL_UYU_PER_USD: usando 40 UYU/USD"
  );
  return 40;
}

/**
 * PayPal REST no soporta UYU: se usa USD con tipo del BROU (mayor compra/venta entre filas de dólar USA).
 * Si falla el BROU: `PAYPAL_UYU_PER_USD` o 40.
 * Otras monedas no soportadas: `PAYPAL_FX_SITE_TO_USD`.
 */
export async function buildPayPalCurrencyContext(
  siteCurrency: string
): Promise<PayPalCurrencyResolution> {
  const c = siteCurrency.trim().toUpperCase();
  if (PAYPAL_CHECKOUT_SUPPORTED.has(c)) {
    return {
      paypalCurrencyCode: c,
      convertAmount: (n) => roundMoney(n),
    };
  }
  if (c === "UYU") {
    const rate = await uyuPerUsdForPayPal();
    return {
      paypalCurrencyCode: "USD",
      convertAmount: (n) => roundMoney(n / rate),
    };
  }
  const mult = Number(process.env.PAYPAL_FX_SITE_TO_USD ?? "");
  if (!Number.isFinite(mult) || mult <= 0) {
    throw new Error(
      `PayPal no admite la moneda «${c}». Usá una moneda soportada en Admin → Pagos, o definí PAYPAL_FX_SITE_TO_USD (monto en ${c} × valor = USD).`
    );
  }
  return {
    paypalCurrencyCode: "USD",
    convertAmount: (n) => roundMoney(n * mult),
  };
}

/** Moneda que debe usar el JS SDK (misma que la orden en PayPal). */
export async function payPalSdkCurrencyForSite(
  siteCurrency: string
): Promise<string> {
  try {
    const ctx = await buildPayPalCurrencyContext(siteCurrency);
    return ctx.paypalCurrencyCode;
  } catch {
    return "USD";
  }
}

type TokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

type PayPalErrorBody = {
  name?: string;
  message?: string;
  details?: { issue?: string; description?: string }[];
};

function paypalBaseUrl(env: PayPalEnv): string {
  return env === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export async function getPayPalSettings(): Promise<{
  clientId: string;
  secret: string;
  env: PayPalEnv;
  currency: string;
  enabled: boolean;
} | null> {
  const s = await prisma.siteSettings.findUnique({ where: { id: "main" } });
  if (!s?.paypalEnabled) return null;
  const id = (s.paypalClientId ?? "").trim();
  const secret = (s.paypalClientSecret ?? "").trim();
  if (!id || !secret) return null;
  const envRaw = (s.paypalEnvironment ?? "sandbox").toLowerCase();
  const env: PayPalEnv = envRaw === "live" ? "live" : "sandbox";
  const currency = ((s.paypalCurrency ?? "UYU").trim() || "UYU").toUpperCase();
  return { clientId: id, secret, env, currency, enabled: true };
}

export async function getPayPalAccessToken(
  clientId: string,
  secret: string,
  env: PayPalEnv
): Promise<string | null> {
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${paypalBaseUrl(env)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const json = (await res.json()) as TokenResponse & PayPalErrorBody;
  if (!res.ok) {
    console.error("[PayPal] OAuth error", res.status, json);
    return null;
  }
  return json.access_token ?? null;
}

function formatPayPalAmount(n: number): string {
  return roundMoney(n).toFixed(2);
}

export type PayPalLineForOrder = {
  name: string;
  quantity: number;
  unitPrice: number;
};

export type PayPalCreateOrderOk = {
  id: string;
  chargedTotal: number;
  chargedCurrency: string;
};

export async function paypalCreateOrder(params: {
  accessToken: string;
  env: PayPalEnv;
  /** Moneda de la tienda (ej. UYU); se mapea a la moneda real de PayPal si hace falta. */
  currency: string;
  referenceId: string;
  lines: PayPalLineForOrder[];
  shippingAmount: number;
}): Promise<PayPalCreateOrderOk | { error: string; status: number }> {
  const { accessToken, env, currency, referenceId, lines, shippingAmount } =
    params;

  let resolution: PayPalCurrencyResolution;
  try {
    resolution = await buildPayPalCurrencyContext(currency);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg, status: 400 };
  }

  const apiCurrency = resolution.paypalCurrencyCode;
  const convLines = lines.map((l) => ({
    ...l,
    unitPrice: resolution.convertAmount(l.unitPrice),
  }));
  const itemTotal = roundMoney(
    convLines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
  );
  const ship = Math.max(
    0,
    roundMoney(resolution.convertAmount(Math.max(0, shippingAmount)))
  );
  const total = roundMoney(itemTotal + ship);

  const items = convLines.map((l) => ({
    name: l.name.slice(0, 127),
    quantity: String(Math.min(999, Math.max(1, l.quantity))),
    unit_amount: {
      currency_code: apiCurrency,
      value: formatPayPalAmount(l.unitPrice),
    },
  }));

  const body = {
    intent: "CAPTURE" as const,
    purchase_units: [
      {
        reference_id: referenceId,
        amount: {
          currency_code: apiCurrency,
          value: formatPayPalAmount(total),
          breakdown: {
            item_total: {
              currency_code: apiCurrency,
              value: formatPayPalAmount(itemTotal),
            },
            shipping: {
              currency_code: apiCurrency,
              value: formatPayPalAmount(ship),
            },
          },
        },
        items,
      },
    ],
  };

  const res = await fetch(`${paypalBaseUrl(env)}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as { id?: string } & PayPalErrorBody;
  if (!res.ok) {
    const detail =
      json.details?.map((d) => d.description || d.issue).join("; ") ||
      json.message ||
      json.name ||
      "create order failed";
    console.error("[PayPal] create order", res.status, json);
    return { error: detail, status: res.status >= 400 && res.status < 600 ? res.status : 502 };
  }
  if (!json.id) {
    return { error: "Respuesta de PayPal sin id de orden", status: 502 };
  }
  return {
    id: json.id,
    chargedTotal: total,
    chargedCurrency: apiCurrency,
  };
}

export type PayPalCaptureResult =
  | {
      ok: true;
      captureId: string;
      status: string;
      amountValue: number;
      currencyCode: string;
    }
  | { ok: false; error: string; raw?: unknown };

export async function paypalCaptureOrder(params: {
  accessToken: string;
  env: PayPalEnv;
  paypalOrderId: string;
}): Promise<PayPalCaptureResult> {
  const { accessToken, env, paypalOrderId } = params;
  const res = await fetch(
    `${paypalBaseUrl(env)}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  const json = (await res.json()) as {
    id?: string;
    status?: string;
    purchase_units?: {
      payments?: {
        captures?: {
          id?: string;
          status?: string;
          amount?: { currency_code?: string; value?: string };
        }[];
      };
    }[];
  } & PayPalErrorBody;

  if (!res.ok) {
    const detail =
      json.details?.map((d) => d.description || d.issue).join("; ") ||
      json.message ||
      json.name ||
      "capture failed";
    console.error("[PayPal] capture", res.status, json);
    return { ok: false, error: detail, raw: json };
  }

  const capture =
    json.purchase_units?.[0]?.payments?.captures?.[0] ?? undefined;
  const captureId = capture?.id;
  const capStatus = capture?.status ?? "";
  const val = capture?.amount?.value;
  const cur = capture?.amount?.currency_code ?? "";

  if (!captureId || val === undefined) {
    console.error("[PayPal] capture response sin capture", json);
    return { ok: false, error: "Respuesta de captura incompleta", raw: json };
  }

  const amountValue = Number(val);
  if (!Number.isFinite(amountValue)) {
    return { ok: false, error: "Monto de captura inválido", raw: json };
  }

  return {
    ok: true,
    captureId,
    status: capStatus,
    amountValue: roundMoney(amountValue),
    currencyCode: cur,
  };
}

export function amountsMatchOrderTotal(
  captured: number,
  orderTotal: number,
  epsilon = 0.02
): boolean {
  return Math.abs(roundMoney(captured) - roundMoney(orderTotal)) <= epsilon;
}
