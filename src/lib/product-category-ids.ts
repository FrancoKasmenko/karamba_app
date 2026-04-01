/** Normaliza IDs de categorías desde el body del admin (multi + compat con categoryId legacy). */
export function normalizeProductCategoryIds(body: {
  categoryIds?: unknown;
  categoryId?: unknown;
}): string[] {
  const raw = body.categoryIds;
  if (Array.isArray(raw)) {
    const ids = raw.filter(
      (x): x is string => typeof x === "string" && x.trim().length > 0
    );
    return [...new Set(ids.map((x) => x.trim()))];
  }
  if (typeof body.categoryId === "string" && body.categoryId.trim()) {
    return [body.categoryId.trim()];
  }
  return [];
}
