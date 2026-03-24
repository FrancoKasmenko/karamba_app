const DEFAULT_SITE = "https://karamba.com.uy";

export function getSiteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    DEFAULT_SITE;
  return raw.replace(/\/$/, "");
}

export function getMetadataBase(): URL {
  return new URL(`${getSiteOrigin()}/`);
}

export function toAbsoluteUrl(pathOrUrl: string): string {
  const t = pathOrUrl.trim();
  if (!t) return `${getSiteOrigin()}/brand/icon.png`;
  if (/^https?:\/\//i.test(t)) return t;
  const path = t.startsWith("/") ? t : `/${t}`;
  return `${getSiteOrigin()}${path}`;
}
