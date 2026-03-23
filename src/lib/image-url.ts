/** Fallback local si no hay imagen válida (colocar en /public/no-image.png). */
export const NO_PRODUCT_IMAGE = "/no-image.png";

const DEBUG =
  process.env.NODE_ENV === "development" &&
  (process.env.NEXT_PUBLIC_DEBUG_PRODUCT_IMAGES === "1" ||
    process.env.DEBUG_PRODUCT_IMAGES === "1");

function logProductImage(
  id: string | undefined,
  name: string | undefined,
  source: string,
  src: string
) {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log(
      `[product-image] id=${id ?? "?"} slug/name=${name ?? "?"} ← ${source}: ${src}`
    );
  }
}

function isBlockedUrl(s: string): boolean {
  return /placehold\.co/i.test(s);
}

function upgradeKarambaHttp(s: string): string {
  if (/^http:\/\/(www\.)?karamba\.com\.uy/i.test(s)) {
    return s.replace(/^http:\/\//i, "https://");
  }
  return s;
}

/**
 * Resuelve ruta local o URL externa (excepto placehold).
 * Nombre suelto → /uploads/products/nombre
 */
export function resolveMediaPath(s: string): string {
  const t = s.trim();
  if (!t || isBlockedUrl(t)) return "";
  if (/^https?:\/\//i.test(t)) return upgradeKarambaHttp(t);
  if (t.startsWith("//")) return upgradeKarambaHttp(`https:${t}`);
  let p = t.startsWith("/") ? t : `/${t}`;
  if (
    p.startsWith("/uploads/") ||
    p.startsWith("/img/") ||
    p === NO_PRODUCT_IMAGE
  ) {
    return p;
  }
  if (/^\/[^/]+$/.test(p)) {
    return `/uploads/products/${p.slice(1)}`;
  }
  return p;
}

export type ProductImageInput = {
  imageUrl?: string | null;
  images?: string[] | null;
  id?: string;
  name?: string;
  slug?: string;
};

/**
 * Prioridad: imageUrl → primera entrada válida en images[] → /no-image.png
 */
export function resolveProductImage(input: ProductImageInput): string {
  const label = input.slug ?? input.name;
  const u = input.imageUrl?.trim();
  if (u && !isBlockedUrl(u)) {
    const src = resolveMediaPath(u);
    if (src) {
      logProductImage(input.id, label, "imageUrl", src);
      return src;
    }
  }
  for (const raw of input.images ?? []) {
    const t = raw?.trim();
    if (!t || isBlockedUrl(t)) continue;
    const src = resolveMediaPath(t);
    if (src) {
      logProductImage(input.id, label, "images[]", src);
      return src;
    }
  }
  logProductImage(input.id, label, "fallback", NO_PRODUCT_IMAGE);
  return NO_PRODUCT_IMAGE;
}

/** Galería: imagen principal primero; resto de images[] sin duplicados ni placehold. */
export function resolveProductImagesGallery(input: ProductImageInput): string[] {
  const primary = resolveProductImage(input);
  if (primary === NO_PRODUCT_IMAGE) return [NO_PRODUCT_IMAGE];
  const seen = new Set<string>([primary]);
  const out: string[] = [primary];
  for (const raw of input.images ?? []) {
    const t = raw?.trim();
    if (!t || isBlockedUrl(t)) continue;
    const src = resolveMediaPath(t);
    if (!src || seen.has(src)) continue;
    seen.add(src);
    out.push(src);
  }
  return out;
}

/** Valor guardado en carrito / líneas antiguas. */
export function resolveStoredProductImage(stored: string | null | undefined): string {
  const t = stored?.trim();
  if (!t || isBlockedUrl(t)) {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log("[product-image] stored ← fallback:", NO_PRODUCT_IMAGE);
    }
    return NO_PRODUCT_IMAGE;
  }
  const src = resolveMediaPath(t) || NO_PRODUCT_IMAGE;
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log("[product-image] stored ←", src);
  }
  return src;
}

/** @deprecated usar resolveProductImage / resolveStoredProductImage */
export const PRODUCT_IMAGE_PLACEHOLDER = NO_PRODUCT_IMAGE;
export function normalizeProductImageSrc(
  raw: string | null | undefined
): string {
  return resolveStoredProductImage(raw);
}
export function normalizeProductImages(urls: string[] | null | undefined): string[] {
  return resolveProductImagesGallery({ images: urls ?? [] });
}
