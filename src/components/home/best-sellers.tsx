"use client";
import { api } from "@/lib/public-api";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ProductCard from "@/components/ui/product-card";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice: number | null;
  images: string[];
  imageUrl?: string | null;
  isDigital?: boolean;
}

export default function BestSellers() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch(api("/api/products/best-sellers"))
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setProducts(data);
      })
      .catch(() => {});
  }, []);

  if (products.length === 0) return null;

  return (
    <section className="relative py-16 sm:py-20 overflow-hidden">
      <div className="absolute top-1/4 right-0 w-72 h-72 bg-peach-light/25 rounded-full blur-[100px] translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary-light/20 rounded-full blur-[90px] -translate-x-1/4 pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Los favoritos
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-warm-gray">
            M&aacute;s Vendidos
          </h2>
          <p className="mt-3 text-gray-500 max-w-xl mx-auto">
            Los productos que m&aacute;s eligen nuestros clientes
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <ProductCard
                id={product.id}
                name={product.name}
                slug={product.slug}
                price={product.price}
                comparePrice={product.comparePrice}
                imageUrl={product.imageUrl}
                images={product.images}
                isDigital={product.isDigital}
              />
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/productos"
            className="inline-flex text-sm font-semibold border-2 border-primary text-primary-dark px-7 py-3 rounded-full hover:bg-primary hover:text-white transition-all"
          >
            Ver todos los productos
          </Link>
        </div>
      </div>
    </section>
  );
}
