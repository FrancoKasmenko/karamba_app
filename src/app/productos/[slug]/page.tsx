import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import ProductDetail from "./product-detail";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: { name: true, description: true },
    });
    if (!product) return { title: "Producto no encontrado" };
    return {
      title: product.name,
      description: product.description || `${product.name} - Karamba`,
    };
  } catch {
    return { title: "Producto" };
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  let product = null;

  try {
    product = await prisma.product.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        comparePrice: true,
        images: true,
        imageUrl: true,
        isDigital: true,
        fileName: true,
        isOnlineCourse: true,
        onlineCourse: { select: { slug: true } },
        variants: true,
        category: { select: { name: true, slug: true } },
      },
    });
  } catch {
    notFound();
  }

  if (!product) notFound();

  if (product.isOnlineCourse && product.onlineCourse) {
    redirect(`/curso/${product.onlineCourse.slug}`);
  }

  const { isOnlineCourse: _oc, onlineCourse: _c, ...forDetail } = product;
  return <ProductDetail product={forDetail} />;
}
