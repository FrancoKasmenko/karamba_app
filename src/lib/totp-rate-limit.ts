/**
 * Límite en memoria: máx. N intentos por ventana (por clave, ej. userId o IP).
 * En serverless multi-instancia no es global; suficiente para reducir fuerza bruta.
 */

const buckets = new Map<string, number[]>();

export function checkTotpRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const prev = buckets.get(key) || [];
  const fresh = prev.filter((t) => now - t < windowMs);
  if (fresh.length >= maxAttempts) {
    buckets.set(key, fresh);
    return false;
  }
  fresh.push(now);
  buckets.set(key, fresh);
  return true;
}
