export type CategoryBranch = {
  id: string;
  name: string;
  slug: string;
  order: number;
  children: CategoryBranch[];
};

type FlatRow = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  order: number;
};

export function buildCategoryTree(flat: FlatRow[]): CategoryBranch[] {
  const map = new Map<string, CategoryBranch>();
  for (const row of flat) {
    map.set(row.id, {
      id: row.id,
      name: row.name,
      slug: row.slug,
      order: row.order,
      children: [],
    });
  }

  const roots: CategoryBranch[] = [];
  for (const row of flat) {
    const node = map.get(row.id)!;
    if (row.parentId == null) {
      roots.push(node);
    } else {
      const parent = map.get(row.parentId);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  }

  const sortRecursive = (nodes: CategoryBranch[]) => {
    nodes.sort(
      (a, b) => a.order - b.order || a.name.localeCompare(b.name, "es")
    );
    for (const n of nodes) sortRecursive(n.children);
  };
  sortRecursive(roots);

  return roots;
}

export function flattenCategorySlugs(roots: CategoryBranch[]): string[] {
  const out: string[] = [];
  function walk(n: CategoryBranch) {
    out.push(n.slug);
    for (const ch of n.children) walk(ch);
  }
  for (const r of roots) walk(r);
  return out;
}

function findNodeBySlug(
  roots: CategoryBranch[],
  slug: string
): CategoryBranch | null {
  for (const r of roots) {
    if (r.slug === slug) return r;
    const d = findNodeBySlug(r.children, slug);
    if (d) return d;
  }
  return null;
}

/** Slugs del nodo indicado y de todo su subárbol (incluye raíz elegida). */
export function getDescendantSlugsForSlug(
  roots: CategoryBranch[],
  targetSlug: string
): string[] | null {
  const node = findNodeBySlug(roots, targetSlug);
  if (!node) return null;
  const slugs: string[] = [];
  function walk(n: CategoryBranch) {
    slugs.push(n.slug);
    for (const ch of n.children) walk(ch);
  }
  walk(node);
  return slugs;
}

export function findCategoryLabelBySlug(
  roots: CategoryBranch[],
  slug: string
): string | null {
  const n = findNodeBySlug(roots, slug);
  return n?.name ?? null;
}
