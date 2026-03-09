"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "@/components/CartContext";
import { formatMoney } from "@/lib/format";

export default function CartDrawer() {
  const { cart, isOpen, closeCart, updateItem, removeItem, clearCart } =
    useCart();

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40"
          onClick={closeCart}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.aside
            className="flex h-full w-[min(420px,92vw)] flex-col gap-4 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Your cart</h3>
              <button
                className="rounded-full border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-800 transition hover:border-gray-400"
                onClick={closeCart}
              >
                Close
              </button>
            </div>
            {cart?.items?.length ? (
              <div className="flex flex-col gap-4">
                {cart.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[64px_1fr_auto] items-center gap-3"
                  >
                    <Image
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-xl object-cover"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.variant.name}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          className="rounded-full border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-400 disabled:opacity-50"
                          onClick={() => updateItem(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          -
                        </button>
                        <span className="text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          className="rounded-full border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-400"
                          onClick={() => updateItem(item.id, item.quantity + 1)}
                        >
                          +
                        </button>
                        <button
                          className="text-xs font-semibold text-gray-500 transition hover:text-gray-700"
                          onClick={() => removeItem(item.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {formatMoney(
                        item.lineTotal?.amount,
                        item.lineTotal?.currency
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Your cart is empty.</p>
            )}
            {cart ? (
              <div className="mt-auto border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <strong>
                    {formatMoney(
                      cart.subtotal?.amount,
                      cart.subtotal?.currency
                    )}
                  </strong>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total</span>
                  <strong>
                    {formatMoney(cart.total?.amount, cart.total?.currency)}
                  </strong>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => clearCart()}
                    className="inline-flex w-full justify-center rounded-full border border-gray-300 py-2.5 text-sm font-semibold text-gray-800 transition hover:border-gray-400"
                  >
                    Clear cart
                  </button>
                  <Link
                    href="/checkout"
                    onClick={closeCart}
                    className="inline-flex w-full justify-center rounded-full bg-gray-900 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
                  >
                    Checkout
                  </Link>
                </div>
              </div>
            ) : null}
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
