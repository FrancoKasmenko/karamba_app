import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import ProductsClient from "./products-client";
import { getSiteOrigin } from "@/lib/site-url";

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
        title: "Productos | Karamba",
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

export default async function ProductosPage() {
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

  let categories: {
    id: string;
    name: string;
    slug: string;
    children: { id: string; name: string; slug: string }[];
  }[] = [];

  try {
    [products, categories] = await Promise.all([
      prisma.product.findMany({
        where: { active: true, isOnlineCourse: false },
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
      }),
      prisma.category.findMany({
        where: { parentId: null },
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          children: {
            orderBy: { order: "asc" },
            select: { id: true, name: true, slug: true },
          },
        },
      }),
    ]);
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
