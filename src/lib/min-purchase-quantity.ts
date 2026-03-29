/** Entero >= 1 para guardar en Product.minPurchaseQuantity */
export function parseMinPurchaseQuantity(raw: unknown): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 999_999);
}
