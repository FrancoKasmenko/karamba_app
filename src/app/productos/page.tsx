import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import ProductsClient from "./products-client";
import { getSiteOrigin } from "@/lib/site-url";
import {
  buildCategoryTree,
  getDescendantCategoryIdsFromRows,
} from "@/lib/categories";
import type { CategoryBranch } from "@/lib/category-tree";

type PageProps = {
  searchParams: Promise<{ categoria?: string }>;
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { categoria } = await searchParams;
  const baseDesc =
    "Explorá nuestra colección completa de productos artesanales Karamba.";
  if (!categoria) {
    return {
      title: "Productos",
      description: baseDesc,
      openGraph: {
        title: "Productos",
        description: baseDesc,
        url: `${getSiteOrigin()}/productos`,
      },
      twitter: {
        card: "summary_large_image",
        description: baseDesc,
      },
    };
  }
  try {
    const cat = await prisma.category.findFirst({
      where: { slug: categoria },
      select: { name: true },
    });
    if (cat) {
      const title = `${cat.name} — Productos`;
      const description = `Productos de ${cat.name}. ${baseDesc}`;
      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url: `${getSiteOrigin()}/productos?categoria=${encodeURIComponent(categoria)}`,
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
        },
      };
    }
  } catch {
    /* DB no disponible en build */
  }
  return {
    title: "Productos",
    description: baseDesc,
  };
}

export default async function ProductosPage({ searchParams }: PageProps) {
  const { categoria } = await searchParams;

  let products: {
    id: string;
    name: string;
    slug: string;
    price: number;
    comparePrice: number | null;
    images: string[];
    featured: boolean;
    isDigital: boolean;
    imageUrl: string | null;
    category: { name: string; slug: string } | null;
  }[] = [];

  let categories: CategoryBranch[] = [];

  try {
    const flat = await prisma.category.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        order: true,
      },
    });
    categories = buildCategoryTree(flat);

    let categoryIdsFilter: string[] | undefined;
    if (categoria) {
      const match = flat.find((c) => c.slug === categoria);
      if (match) {
        categoryIdsFilter = getDescendantCategoryIdsFromRows(flat, match.id);
      }
    }

    products = await prisma.product.findMany({
      where: {
        active: true,
        isOnlineCourse: false,
        ...(categoryIdsFilter?.length
          ? { categoryId: { in: categoryIdsFilter } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        comparePrice: true,
        images: true,
        featured: true,
        isDigital: true,
        imageUrl: true,
        category: { select: { name: true, slug: true } },
      },
    });
  } catch {
    // DB not connected
  }

  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-gray-400">
          Cargando productos...
        </div>
      }
    >
      <ProductsClient initialProducts={products} categories={categories} />
    </Suspense>
  );
}
