import { prisma } from "@/lib/prisma";

export * from "@/lib/category-tree";

const descendantIdsCache = new Map<string, string[]>();

type CategoryParentRow = { id: string; parentId: string | null };

function buildChildrenByParent(rows: CategoryParentRow[]) {
  const byParent = new Map<string | null, string[]>();
  for (const r of rows) {
    const p = r.parentId;
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p)!.push(r.id);
  }
  return byParent;
}

/** Sin I/O: usa filas ya cargadas (misma petición que el árbol de categorías). */
export function getDescendantCategoryIdsFromRows(
  rows: CategoryParentRow[],
  rootId: string
): string[] {
  const byParent = buildChildrenByParent(rows);
  function collect(id: string): string[] {
    const out = [id];
    for (const cid of byParent.get(id) ?? []) {
      out.push(...collect(cid));
    }
    return out;
  }
  return collect(rootId);
}

/**
 * IDs de la categoría raíz y de todos sus descendientes (recursivo).
 * Una consulta a Category; el resto en memoria. Caché por id de raíz.
 */
export async function getDescendantCategoryIds(
  rootId: string
): Promise<string[]> {
  const cached = descendantIdsCache.get(rootId);
  if (cached) return cached;

  const rows = await prisma.category.findMany({
    select: { id: true, parentId: true },
  });

  const ids = getDescendantCategoryIdsFromRows(rows, rootId);
  descendantIdsCache.set(rootId, ids);
  return ids;
}

export function invalidateCategoryDescendantCache(): void {
  descendantIdsCache.clear();
}
