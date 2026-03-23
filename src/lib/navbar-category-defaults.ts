import type { PrismaClient } from "@prisma/client";

/** Slugs de raíz que deben mostrarse en el sub-navbar si aún no hay ninguna marcada. */
export const DEFAULT_NAVBAR_ROOT_SLUGS = [
  "herramientas",
  "insumos",
  "encuadernacion",
  "moldes",
  "organizadores",
  "exhibidores",
  "para-tu-marca",
  "regalos",
  "regalos-y-detalles",
  "kits-para-crear",
  "ofertas-y-saldos",
  "recursos-digitales",
];

const DEFAULT_NAVBAR_ROOT_NAMES = [
  "Herramientas",
  "Insumos",
  "Encuadernación",
  "Moldes",
  "Organizadores",
  "Exhibidores",
  "Para tu marca",
  "Regalos y detalles",
  "Regalos",
  "Kits para crear",
  "Ofertas y saldos",
  "Recursos digitales",
];

/**
 * Activa showInNavbar en raíces que coincidan con slugs o nombres canónicos.
 * Llamar solo cuando aún no hay ninguna categoría visible en navbar.
 */
export async function applyDefaultNavbarCategoryFlags(db: PrismaClient) {
  await db.category.updateMany({
    where: {
      parentId: null,
      slug: { in: DEFAULT_NAVBAR_ROOT_SLUGS },
    },
    data: { showInNavbar: true },
  });

  for (const name of DEFAULT_NAVBAR_ROOT_NAMES) {
    await db.category.updateMany({
      where: {
        parentId: null,
        name: { equals: name, mode: "insensitive" },
      },
      data: { showInNavbar: true },
    });
  }
}

export const navbarCategorySelect = {
  id: true,
  name: true,
  slug: true,
  children: {
    orderBy: { order: "asc" as const },
    select: { id: true, name: true, slug: true },
  },
} as const;
