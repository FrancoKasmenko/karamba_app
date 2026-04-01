import type { Product } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function normalizeLocationPart(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();
}

function zoneMatchesRow(
  departmentNames: string[],
  cityNames: string[],
  departamento: string,
  city: string
): boolean {
  const nd = normalizeLocationPart(departamento);
  const nc = normalizeLocationPart(city);
  const deptMatch =
    departmentNames.length === 0 ||
    departmentNames.some((x) => normalizeLocationPart(x) === nd);
  const cityMatch =
    cityNames.length === 0 ||
    cityNames.some((x) => {
      const nz = normalizeLocationPart(x);
      return nc === nz || nc.includes(nz) || nz.includes(nc);
    });

  if (departmentNames.length > 0 && cityNames.length > 0) {
    return deptMatch && cityMatch;
  }
  if (departmentNames.length > 0) return deptMatch;
  if (cityNames.length > 0) return cityMatch;
  return false;
}

export type ShippingQuoteInput = {
  productIds: string[];
  delivery: "shipping" | "pickup";
  departamento: string;
  city: string;
};

export type ShippingQuoteResult = {
  cost: number;
  zoneId: string | null;
  zoneName: string | null;
  /** Sin zona configurada: costo 0 y coordinar por WhatsApp */
  pendingManualQuote: boolean;
  skipPhysicalDelivery: boolean;
};

export async function quoteShippingFromProducts(
  input: ShippingQuoteInput
): Promise<ShippingQuoteResult> {
  const { productIds, delivery, departamento, city } = input;

  if (productIds.length === 0) {
    return {
      cost: 0,
      zoneId: null,
      zoneName: null,
      pendingManualQuote: false,
      skipPhysicalDelivery: true,
    };
  }

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, isDigital: true, isOnlineCourse: true },
  });

  if (products.length !== productIds.length) {
    throw new Error("Producto no encontrado");
  }

  const skipPhysicalDelivery = products.every(
    (p: Pick<Product, "isDigital" | "isOnlineCourse">) =>
      p.isOnlineCourse || p.isDigital
  );

  if (skipPhysicalDelivery || delivery === "pickup") {
    return {
      cost: 0,
      zoneId: null,
      zoneName: null,
      pendingManualQuote: false,
      skipPhysicalDelivery,
    };
  }

  const zones = await prisma.shippingZone.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  for (const z of zones) {
    if (
      zoneMatchesRow(z.departmentNames, z.cityNames, departamento.trim(), city.trim())
    ) {
      return {
        cost: Math.max(0, round2(z.price)),
        zoneId: z.id,
        zoneName: z.name,
        pendingManualQuote: false,
        skipPhysicalDelivery: false,
      };
    }
  }

  return {
    cost: 0,
    zoneId: null,
    zoneName: null,
    pendingManualQuote: true,
    skipPhysicalDelivery: false,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
