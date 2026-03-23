"use client";

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

export default function FeaturedProducts({
  products,
}: {
  products: Product[];
}) {
  return (
    <section className="relative py-16 sm:py-20 overflow-hidden">
      <div className="absolute top-0 left-0 w-80 h-80 bg-lavender/20 rounded-full blur-[100px] -translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-mint/20 rounded-full blur-[90px] translate-x-1/4 pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-secondary-dark font-semibold text-sm uppercase tracking-wider">
            Lo m&aacute;s elegido
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-warm-gray">
            Productos Destacados
          </h2>
          <p className="mt-3 text-gray-500 max-w-xl mx-auto">
            Nuestras creaciones m&aacute;s populares, elegidas por vos
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
            className="inline-flex text-sm font-semibold border-2 border-secondary text-secondary-dark px-7 py-3 rounded-full hover:bg-secondary hover:text-white transition-all"
          >
            Ver todos los productos
          </Link>
        </div>
      </div>
    </section>
  );
}
