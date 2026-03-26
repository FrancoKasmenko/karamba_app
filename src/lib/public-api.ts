/**
 * Prefijo público para rutas que internamente viven en `/app/api`.
 * Next reescribe `/_k/*` → `/api/*` (next.config). No es seguridad: solo
 * cambia la URL visible en el navegador (pestaña Red).
 */
export const PUBLIC_API_PREFIX = "/_k" as const;

/**
 * Convierte una ruta interna `/api/...` en la URL que debe usar el cliente.
 */
export function api(absApiPath: string): string {
  const p = absApiPath.trim();
  if (p === "/api") return PUBLIC_API_PREFIX;
  if (!p.startsWith("/api/")) {
    throw new Error(`api() espera una ruta que empiece con /api/, recibió: ${absApiPath}`);
  }
  return `${PUBLIC_API_PREFIX}${p.slice(4)}`;
}

/**
 * Acepta URLs guardadas como `/api/...` y devuelve la forma pública `/_k/...`.
 * Si ya es `/_k/` u otra ruta, la deja igual.
 */
export function publicUrlFromStored(stored: string): string {
  const t = stored.trim();
  if (t.startsWith("/api/")) return api(t);
  return t;
}
