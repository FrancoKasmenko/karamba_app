/** Origen público por defecto (SEO, OG, enlaces si el .env apunta solo a IP del VPS) */
export const DEFAULT_PUBLIC_SITE_ORIGIN = "https://karamba.com.uy";

function isIPv4Host(host: string): boolean {
  return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(host);
}

function originFromUrlLike(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const withScheme = t.includes("://") ? t : `https://${t}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return null;
  }
}

export function getSiteOrigin(): string {
  const pub = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (pub) {
    const o = originFromUrlLike(pub);
    if (o) {
      if (!isIPv4Host(new URL(o).hostname)) return o;
      return DEFAULT_PUBLIC_SITE_ORIGIN;
    }
  }
  const auth = process.env.NEXTAUTH_URL?.trim();
  if (auth) {
    const o = originFromUrlLike(auth);
    if (o && !isIPv4Host(new URL(o).hostname)) return o;
  }
  return DEFAULT_PUBLIC_SITE_ORIGIN;
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
