import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  variant?: string;
  quantity: number;
  /** Cantidad mínima acordada al agregar (>=1). Líneas antiguas sin campo = 1 */
  minPurchaseQuantity?: number;
}

interface CartState {
  items: CartItem[];
  /** false si la cantidad total quedaría por debajo del mínimo de compra */
  addItem: (item: CartItem) => boolean;
  removeItem: (productId: string, variant?: string) => void;
  updateQuantity: (
    productId: string,
    quantity: number,
    variant?: string
  ) => boolean;
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const min = Math.max(
          1,
          Math.floor(Number(item.minPurchaseQuantity) || 1)
        );
        const items = get().items;
        const key = `${item.productId}-${item.variant || ""}`;
        const existing = items.find(
          (i) => `${i.productId}-${i.variant || ""}` === key
        );

        const nextQty = existing
          ? existing.quantity + item.quantity
          : item.quantity;
        if (nextQty < min) {
          return false;
        }

        if (existing) {
          set({
            items: items.map((i) =>
              `${i.productId}-${i.variant || ""}` === key
                ? {
                    ...i,
                    quantity: i.quantity + item.quantity,
                    minPurchaseQuantity: min,
                  }
                : i
            ),
          });
        } else {
          set({
            items: [...items, { ...item, minPurchaseQuantity: min }],
          });
        }
        return true;
      },

      removeItem: (productId, variant) => {
        const key = `${productId}-${variant || ""}`;
        set({
          items: get().items.filter(
            (i) => `${i.productId}-${i.variant || ""}` !== key
          ),
        });
      },

      updateQuantity: (productId, quantity, variant) => {
        const key = `${productId}-${variant || ""}`;
        const line = get().items.find(
          (i) => `${i.productId}-${i.variant || ""}` === key
        );
        const min = Math.max(
          1,
          Math.floor(Number(line?.minPurchaseQuantity) || 1)
        );
        if (quantity > 0 && quantity < min) {
          return false;
        }
        if (quantity <= 0) {
          set({
            items: get().items.filter(
              (i) => `${i.productId}-${i.variant || ""}` !== key
            ),
          });
        } else {
          set({
            items: get().items.map((i) =>
              `${i.productId}-${i.variant || ""}` === key
                ? { ...i, quantity }
                : i
            ),
          });
        }
        return true;
      },

      clearCart: () => set({ items: [] }),

      total: () =>
        get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

      itemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    { name: "karamba-cart" }
  )
);
