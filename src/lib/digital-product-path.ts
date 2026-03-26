/** Prefijo canónico guardado en BD y devuelto por el upload. */
export const DIGITAL_PRODUCTS_API_PREFIX = "/api/uploads/digital-products";

/** Misma ruta vía rewrite público `/_k` → `/api`. */
export const DIGITAL_PRODUCTS_K_PREFIX = "/_k/uploads/digital-products";

/** Datos antiguos o rutas relativas sin `/api`. */
const DIGITAL_PRODUCTS_LEGACY_PREFIX = "/uploads/digital-products";

/**
 * Convierte cualquier forma aceptable (relativa, `/_k/…`, `https://…/…`) en
 * `/api/uploads/digital-products/<archivo>`, o null si no es una ruta válida.
 * Evita falsos rechazos cuando `resolveMediaPath` devuelve URL absoluta.
 */
export function canonicalizeDigitalProductFileUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw || raw.includes("..")) return null;

  let path = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      path = new URL(raw).pathname;
    } catch {
      return null;
    }
  }

  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  path = path.replace(/\/+/g, "/");

  const prefixes = [
    `${DIGITAL_PRODUCTS_API_PREFIX}/`,
    `${DIGITAL_PRODUCTS_K_PREFIX}/`,
    `${DIGITAL_PRODUCTS_LEGACY_PREFIX}/`,
  ];

  for (const prefix of prefixes) {
    if (!path.startsWith(prefix)) continue;
    const rest = path.slice(prefix.length);
    if (!rest || rest.includes("/")) return null;
    return `${DIGITAL_PRODUCTS_API_PREFIX}/${rest}`;
  }

  return null;
}

export function isAllowedDigitalPath(url: string): boolean {
  return canonicalizeDigitalProductFileUrl(url) !== null;
}
