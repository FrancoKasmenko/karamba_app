export function getBaseUrl(): string {
  if (process.env.BASE_URL)
    return process.env.BASE_URL.replace(/\/$/, "");
  if (process.env.NEXT_PUBLIC_SITE_URL)
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.NEXTAUTH_URL)
    return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  return "http://localhost:3000";
}

function isLocalHostname(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".local")
  );
}

/**
 * Origen (protocolo + host, sin path) para Mercado Pago.
 * MP exige HTTPS en back_urls y notification_url en sitios públicos (no localhost).
 */
export function getMercadoPagoSiteOrigin(): string {
  const raw = getBaseUrl().trim();
  if (!raw) return "http://localhost:3000";

  const withScheme = raw.includes("://") ? raw : `https://${raw}`;

  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return raw;
  }

  if (!isLocalHostname(u.hostname) && u.protocol === "http:") {
    u = new URL(u.href.replace(/^http:\/\//i, "https://"));
  }

  return `${u.protocol}//${u.host}`;
}

/** Path que empieza con /, ej. /checkout/success?orderId=abc */
export function mercadoPagoAbsoluteUrl(pathAndQuery: string): string {
  const origin = getMercadoPagoSiteOrigin();
  const path = pathAndQuery.startsWith("/")
    ? pathAndQuery
    : `/${pathAndQuery}`;
  return `${origin}${path}`;
}

export function getWebhookUrl(): string {
  return `${getMercadoPagoSiteOrigin()}/api/webhooks/mercadopago`;
}

export function isPublicUrl(): boolean {
  try {
    const u = new URL(getMercadoPagoSiteOrigin());
    return !isLocalHostname(u.hostname);
  } catch {
    return false;
  }
}
