"use client";

import { useCart } from "@/components/CartContext";

export default function CartButton() {
  const { cart, openCart } = useCart();
  const count = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <button
      className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-gray-400"
      onClick={openCart}
    >
      Cart {count > 0 ? `(${count})` : ""}
    </button>
  );
}
