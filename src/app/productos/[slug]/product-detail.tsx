"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { FiShoppingBag, FiMinus, FiPlus } from "react-icons/fi";
import { useCartStore } from "@/store/cart";
import ProductPrice from "@/components/product/product-price";
import MercadoPagoInstallments from "@/components/product/mercadopago-installments";
import {
  resolveProductImage,
  resolveProductImagesGallery,
  isLocalUploadPath,
} from "@/lib/image-url";
import Button from "@/components/ui/button";
import PurchaseInfo from "@/components/product/purchase-info";
import { DescriptionText } from "@/components/ui/description-text";
import Link from "next/link";
import { ProductShippingEstimate } from "@/components/product/product-shipping-estimate";
import toast from "react-hot-toast";
import { trackAnalytics } from "@/lib/analytics-client";

interface Variant {
  id: string;
  name: string;
  value: string;
  price: number | null;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  images: string[];
  imageUrl: string | null;
  variants: Variant[];
  categories: { name: string; slug: string }[];
  isDigital: boolean;
  isOnlineCourse?: boolean;
  fileName: string | null;
  minPurchaseQuantity?: number;
}

export default function ProductDetail({ product }: { product: Product }) {
  const minQty = Math.max(1, Math.floor(product.minPurchaseQuantity ?? 1) || 1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [quantity, setQuantity] = useState(minQty);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    trackAnalytics({
      type: "view_item",
      productId: product.id,
      metadata: { slug: product.slug, name: product.name },
    });
  }, [product.id, product.slug, product.name]);

  const currentPrice = selectedVariant?.price ?? product.price;
  const images = resolveProductImagesGallery({
    imageUrl: product.imageUrl,
    images: product.images,
    id: product.id,
    name: product.name,
    slug: product.slug,
  });

  const variantGroups = product.variants.reduce<Record<string, Variant[]>>(
    (acc, v) => {
      if (!acc[v.name]) acc[v.name] = [];
      acc[v.name].push(v);
      return acc;
    },
    {}
  );

  const handleAddToCart = () => {
    if (quantity < minQty) {
      toast.error(`La cantidad mínima de compra es ${minQty} unidades.`);
      return;
    }
    const lineImage = resolveProductImage({
      imageUrl: product.imageUrl,
      images: product.images,
      id: product.id,
      name: product.name,
      slug: product.slug,
    });
    const ok = addItem({
      productId: product.id,
      name: product.name,
      price: currentPrice,
      image: lineImage,
      variant: selectedVariant?.value,
      quantity,
      minPurchaseQuantity: minQty,
    });
    if (!ok) {
      toast.error(
        `No se puede agregar: el total en el carrito debe ser al menos ${minQty} unidades.`
      );
      return;
    }
    const cartTotal = useCartStore.getState().total();
    trackAnalytics({
      type: "add_to_cart",
      productId: product.id,
      metadata: {
        slug: product.slug,
        quantity,
        variant: selectedVariant?.value,
        cartTotal,
        currency: "UYU",
      },
    });
    toast.success("Agregado al carrito");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Images */}
        <div>
          <motion.div
            key={selectedImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative aspect-square rounded-3xl overflow-hidden bg-soft-gray shadow-sm"
          >
            <Image
              src={images[selectedImage]}
              alt={product.name}
              fill
              unoptimized={isLocalUploadPath(images[selectedImage])}
              className="object-cover"
              priority
            />
            {product.comparePrice != null &&
              product.comparePrice > currentPrice && (
                <span className="absolute top-4 left-4 bg-rose text-white text-xs font-bold px-3 py-1.5 rounded-full shadow">
                  -
                  {Math.round(
                    ((product.comparePrice - currentPrice) /
                      product.comparePrice) *
                      100
                  )}
                  %
                </span>
              )}
          </motion.div>
          {images.length > 1 && (
            <div className="flex gap-3 mt-4">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                    i === selectedImage
                      ? "border-primary shadow-md"
                      : "border-transparent hover:border-primary-light"
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${product.name} ${i + 1}`}
                    fill
                    unoptimized={isLocalUploadPath(img)}
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          {product.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {product.categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/productos?categoria=${encodeURIComponent(c.slug)}`}
                  className="text-sm text-primary font-semibold uppercase tracking-wider hover:underline"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-warm-gray leading-tight">
            {product.name}
          </h1>

          <div className="mt-4">
            <ProductPrice
              transferPrice={currentPrice}
              comparePrice={product.comparePrice}
            />
          </div>

          <MercadoPagoInstallments baseTransferPrice={currentPrice} />

          <ProductShippingEstimate
            productId={product.id}
            isDigital={product.isDigital}
            isOnlineCourse={Boolean(product.isOnlineCourse)}
          />

          <DescriptionText
            className="mt-6 text-gray-600 leading-relaxed"
            as="div"
          >
            {product.description}
          </DescriptionText>

          {/* Variants */}
          {Object.entries(variantGroups).map(([name, variants]) => (
            <div key={name} className="mt-6">
              <h3 className="text-sm font-semibold text-warm-gray mb-2.5">
                {name}
              </h3>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={`px-4 py-2 text-sm rounded-full border-2 transition-all font-medium ${
                      selectedVariant?.id === v.id
                        ? "border-primary bg-primary-light/30 text-primary-dark"
                        : "border-gray-200 text-gray-600 hover:border-primary-light hover:bg-primary-light/10"
                    }`}
                  >
                    {v.value}
                    {!product.isDigital && v.stock <= 3 && v.stock > 0 && (
                      <span className="ml-1 text-xs text-rose">
                        ({v.stock} left)
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Quantity (físicos siempre; digitales solo si hay mínimo > 1) */}
          {(!product.isDigital || minQty > 1) && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-warm-gray mb-2.5">
                Cantidad
                {minQty > 1 && (
                  <span className="font-normal text-gray-500 ml-2">
                    (mín. {minQty})
                  </span>
                )}
              </h3>
              <div className="inline-flex items-center border-2 border-gray-200 rounded-full">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(minQty, quantity - 1))}
                  className="p-2.5 text-gray-500 hover:text-primary-dark transition-colors"
                >
                  <FiMinus size={16} />
                </button>
                <span className="px-5 text-sm font-bold min-w-[40px] text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2.5 text-gray-500 hover:text-primary-dark transition-colors"
                >
                  <FiPlus size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Add to cart */}
          <div className="mt-8">
            <Button
              size="lg"
              onClick={handleAddToCart}
              className="w-full sm:w-auto"
            >
              <FiShoppingBag className="mr-2" />
              Agregar al Carrito
            </Button>
          </div>

          {/* Extra info */}
          <div className="mt-8 space-y-3 text-sm text-gray-500">
            {product.isDigital ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                  Descarga protegida desde tu cuenta cuando el pago esté
                  aprobado
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Pagos seguros con MercadoPago
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  Envíos a todo Uruguay
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Pagos seguros con MercadoPago
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Selección y detalle en cada pieza
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <PurchaseInfo />
    </div>
  );
}
