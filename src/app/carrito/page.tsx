"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { FiTrash2, FiMinus, FiPlus, FiShoppingBag } from "react-icons/fi";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { resolveStoredProductImage, isLocalUploadPath } from "@/lib/image-url";
import Button from "@/components/ui/button";

export default function CarritoPage() {
  const { items, removeItem, updateQuantity, total } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <FiShoppingBag size={48} className="text-gray-300 mb-4" />
        <h1 className="font-display text-2xl font-bold text-gray-800 mb-2">
          Tu carrito está vacío
        </h1>
        <p className="text-gray-500 mb-6">
          Explorá nuestros productos y agregá lo que te guste
        </p>
        <Link href="/productos">
          <Button>Ver Productos</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="font-display text-3xl font-bold text-gray-800 mb-8">
        Tu Carrito
      </h1>

      <div className="space-y-4">
        {items.map((item, i) => (
          <motion.div
            key={`${item.productId}-${item.variant}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex gap-4 bg-white rounded-2xl p-4 border border-primary-light/30"
          >
            <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-soft-gray shrink-0">
              <Image
                src={resolveStoredProductImage(item.image)}
                alt={item.name}
                fill
                unoptimized={isLocalUploadPath(
                  resolveStoredProductImage(item.image)
                )}
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-800 truncate">
                {item.name}
              </h3>
              {item.variant && (
                <span className="text-xs text-gray-500">{item.variant}</span>
              )}
              <p className="text-primary-dark font-semibold mt-1">
                {formatPrice(item.price)}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <div className="inline-flex items-center border border-gray-200 rounded-full">
                  <button
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity - 1, item.variant)
                    }
                    className="p-1.5 text-gray-500 hover:text-primary-dark"
                  >
                    <FiMinus size={14} />
                  </button>
                  <span className="px-3 text-sm font-medium">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity + 1, item.variant)
                    }
                    className="p-1.5 text-gray-500 hover:text-primary-dark"
                  >
                    <FiPlus size={14} />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.productId, item.variant)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
            <div className="text-right">
              <span className="font-semibold text-gray-800">
                {formatPrice(item.price * item.quantity)}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-8 bg-white rounded-2xl border border-primary-light/30 p-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-semibold text-lg text-gray-800">
            {formatPrice(total())}
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Los costos de envío se calculan al finalizar la compra
        </p>
        <Link href="/checkout" className="block">
          <Button size="lg" className="w-full">
            Finalizar Compra
          </Button>
        </Link>
      </div>
    </div>
  );
}
