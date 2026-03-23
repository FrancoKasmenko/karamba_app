import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  variant?: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variant?: string) => void;
  updateQuantity: (productId: string, quantity: number, variant?: string) => void;
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const items = get().items;
        const key = `${item.productId}-${item.variant || ""}`;
        const existing = items.find(
          (i) => `${i.productId}-${i.variant || ""}` === key
        );

        if (existing) {
          set({
            items: items.map((i) =>
              `${i.productId}-${i.variant || ""}` === key
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          });
        } else {
          set({ items: [...items, item] });
        }
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
