"use client";

import Link from "next/link";
import { FiShoppingBag } from "react-icons/fi";
import { useCartStore } from "@/store/cart";
import { resolveProductImage } from "@/lib/image-url";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";

export default function CourseBuyButton({
  product,
}: {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    imageUrl: string | null;
    images: string[];
  };
}) {
  const addItem = useCartStore((s) => s.addItem);

  const handleAdd = () => {
    const image = resolveProductImage({
      imageUrl: product.imageUrl,
      images: product.images,
      id: product.id,
      name: product.name,
      slug: product.slug,
    });
    const ok = addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image,
      quantity: 1,
      minPurchaseQuantity: 1,
    });
    if (!ok) {
      toast.error("No se pudo agregar al carrito (cantidad mínima).");
      return;
    }
    toast.success("Curso agregado al carrito");
  };

  return (
    <Button size="lg" onClick={handleAdd}>
      <FiShoppingBag className="mr-2" />
      Comprar curso
    </Button>
  );
}

export function CourseBuyActions({
  product,
}: {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    imageUrl: string | null;
    images: string[];
  };
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <CourseBuyButton product={product} />
      <Link href="/carrito">
        <Button variant="outline" size="lg">
          Ver carrito
        </Button>
      </Link>
    </div>
  );
}
