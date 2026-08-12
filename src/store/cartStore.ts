import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Book } from "../types";

type CartItem = {
  book: Book;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  addToCart: (book: Book) => void;
  removeFromCart: (bookId: number) => void;
  updateQuantity: (bookId: number, quantity: number) => void;
  clearCart: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addToCart: (book) =>
        set((state) => {
          const existing = state.items.find((item) => item.book.id === book.id);
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.book.id === book.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            };
          }
          return { items: [...state.items, { book, quantity: 1 }] };
        }),
      removeFromCart: (bookId) =>
        set((state) => ({
          items: state.items.filter((item) => item.book.id !== bookId),
        })),
      updateQuantity: (bookId, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.book.id === bookId
              ? { ...item, quantity: Math.max(1, quantity) }
              : item
          ),
        })),
      clearCart: () => set({ items: [] }),
    }),
    { name: "leila-cart" }
  )
);