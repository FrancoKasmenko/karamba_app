/**
 * Normaliza el código ingresado en login 2FA:
 * - TOTP: exactamente 6 dígitos (se ignoran espacios/guiones solo si quedan 6 dígitos).
 * - Respaldo: hex mayúsculas, típicamente 10 caracteres (se quitan espacios, guiones y demás).
 */
export function normalizeTwoFactorCodePayload(raw: string): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const noSpace = s.replace(/\s+/g, "").replace(/-/g, "");
  if (/^\d{6}$/.test(noSpace)) return noSpace;
  return noSpace.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
}

export function isValidTwoFactorCodePayload(normalized: string): boolean {
  if (!normalized) return false;
  if (/^\d{6}$/.test(normalized)) return true;
  return normalized.length >= 8;
}
