import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import ProductsClient from "./products-client";

export const metadata: Metadata = {
  title: "Productos",
  description:
    "Explorá nuestra colección completa de productos artesanales Karamba.",
};

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
    <Suspense fallback={<div className="py-20 text-center text-gray-400">Cargando productos...</div>}>
      <ProductsClient
        initialProducts={products}
        categories={categories}
      />
    </Suspense>
  );
}
