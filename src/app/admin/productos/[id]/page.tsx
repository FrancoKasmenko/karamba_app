"use client";
import { api } from "@/lib/public-api";

import { useEffect, useState, use } from "react";
import ProductForm from "../product-form";

export default function EditProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [product, setProduct] = useState<null | Record<string, unknown>>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(api(`/api/admin/products/${id}`))
      .then((res) => res.json())
      .then((data) => {
        setProduct(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <div className="text-gray-400 py-10">Cargando producto...</div>;
  }

  if (!product) {
    return <div className="text-gray-400 py-10">Producto no encontrado</div>;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-gray-800 mb-6">
        Editar Producto
      </h1>
      <ProductForm
        initialData={{
          id: product.id as string,
          name: product.name as string,
          description: (product.description as string) || "",
          price: String(product.price),
          comparePrice: product.comparePrice
            ? String(product.comparePrice)
            : "",
          images: (product.images as string[]) || [],
          imageUrl: (product.imageUrl as string) || "",
          featured: product.featured as boolean,
          active: product.active as boolean,
          categoryId: (product.categoryId as string) || "",
          variants: (
            product.variants as {
              name: string;
              value: string;
              price?: number;
              stock?: number;
            }[]
          ).map((v) => ({
            name: v.name,
            value: v.value,
            price: v.price,
            stock: v.stock,
          })),
          isDigital: Boolean(product.isDigital),
          fileUrl: (product.fileUrl as string) || "",
          fileName: (product.fileName as string) || "",
        }}
      />
    </div>
  );
}
