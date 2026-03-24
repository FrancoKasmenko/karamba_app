/**
 * Elimina etiquetas HTML y recorta; reduce riesgo de XSS al persistir texto plano.
 */
export function sanitizePlainText(
  input: unknown,
  maxLen = 5000
): string | undefined {
  if (input == null) return undefined;
  const s = String(input)
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLen);
  return s.length ? s : undefined;
}

export function normalizeEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return e.slice(0, 254);
}
