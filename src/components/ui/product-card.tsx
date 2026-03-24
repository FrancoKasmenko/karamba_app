"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/utils";
import { resolveProductImage, isLocalUploadPath } from "@/lib/image-url";

interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number | null;
  imageUrl?: string | null;
  images?: string[];
  isDigital?: boolean;
}

export default function ProductCard({
  id,
  name,
  slug,
  price,
  comparePrice,
  imageUrl,
  images,
  isDigital,
}: ProductCardProps) {
  const src = resolveProductImage({
    imageUrl,
    images: images ?? [],
    id,
    name,
    slug,
  });

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.2 }}
      className="group"
    >
      <Link href={`/productos/${slug}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-soft-gray shadow-sm group-hover:shadow-xl transition-shadow duration-300">
          <Image
            src={src}
            alt={name}
            fill
            unoptimized={isLocalUploadPath(src)}
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          {comparePrice && comparePrice > price && (
            <span className="absolute top-3 left-3 bg-rose text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
              -{Math.round(((comparePrice - price) / comparePrice) * 100)}%
            </span>
          )}
          {isDigital && (
            <span className="absolute top-3 right-3 bg-violet-600 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full shadow-sm">
              Descargable
            </span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        <div className="mt-3 px-0.5">
          <h3 className="text-sm font-semibold text-warm-gray group-hover:text-primary transition-colors line-clamp-2">
            {name}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-base font-bold text-primary-dark">
              {formatPrice(price)}
            </span>
            {comparePrice && comparePrice > price && (
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(comparePrice)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
