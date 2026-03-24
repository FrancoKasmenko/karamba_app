import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import ProductDetail from "./product-detail";
import { toAbsoluteUrl } from "@/lib/site-url";

interface Props {
  params: Promise<{ slug: string }>;
}

function plainTextDescription(htmlOrText: string | null, fallback: string) {
  if (!htmlOrText) return fallback;
  const t = htmlOrText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return t.slice(0, 160) || fallback;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: {
        name: true,
        description: true,
        images: true,
        imageUrl: true,
      },
    });
    if (!product) return { title: "Producto no encontrado" };
    const description = plainTextDescription(
      product.description,
      `${product.name} - Karamba`
    );
    const firstImg =
      product.imageUrl?.trim() ||
      product.images?.find((x) => String(x).trim()) ||
      "";
    const ogImage = firstImg
      ? toAbsoluteUrl(String(firstImg))
      : toAbsoluteUrl("/brand/icon.png");
    return {
      title: product.name,
      description,
      openGraph: {
        title: product.name,
        description,
        type: "website",
        images: [{ url: ogImage, alt: product.name }],
      },
      twitter: {
        card: "summary_large_image",
        title: product.name,
        description,
        images: [ogImage],
      },
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
