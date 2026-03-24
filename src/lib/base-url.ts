export function getBaseUrl(): string {
  if (process.env.BASE_URL)
    return process.env.BASE_URL.replace(/\/$/, "");
  if (process.env.NEXT_PUBLIC_SITE_URL)
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.NEXTAUTH_URL)
    return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  return "http://localhost:3000";
}

export function getWebhookUrl(): string {
  return `${getBaseUrl()}/api/webhooks/mercadopago`;
}

export function isPublicUrl(): boolean {
  const url = getBaseUrl();
  return !url.includes("localhost") && !url.includes("127.0.0.1");
}
