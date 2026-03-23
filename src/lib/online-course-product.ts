import type { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

export type CourseProductDb = Prisma.TransactionClient;

/** Slug único para `Product` (puede coincidir con el del curso si no hay conflicto). */
export async function uniqueProductSlug(
  db: CourseProductDb,
  base: string,
  excludeProductId?: string | null
): Promise<string> {
  let s = base.trim().replace(/\s+/g, "-");
  if (!s) s = `curso-${randomUUID().slice(0, 10)}`;
  let n = 0;
  while (true) {
    const candidate = n === 0 ? s : `${s}-${n}`;
    const found = await db.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!found || found.id === excludeProductId) return candidate;
    n += 1;
  }
}

export function courseImageForProduct(image: string | null | undefined): {
  images: string[];
  imageUrl: string | null;
} {
  const img = String(image ?? "").trim();
  if (!img) return { images: [], imageUrl: null };
  return { images: [img], imageUrl: img };
}
