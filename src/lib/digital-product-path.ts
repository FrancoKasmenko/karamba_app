/** Prefijo canónico guardado en BD y devuelto por el upload. */
export const DIGITAL_PRODUCTS_API_PREFIX = "/api/uploads/digital-products";

/** Misma ruta vía rewrite público `/_k` → `/api`. */
export const DIGITAL_PRODUCTS_K_PREFIX = "/_k/uploads/digital-products";

export function isAllowedDigitalPath(url: string): boolean {
  if (!url || url.includes("..")) return false;
  return (
    url.startsWith(`${DIGITAL_PRODUCTS_API_PREFIX}/`) ||
    url.startsWith(`${DIGITAL_PRODUCTS_K_PREFIX}/`)
  );
}
