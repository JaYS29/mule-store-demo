"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartContext";

type StoredCart = {
  items: {
    id: string;
    quantity: number;
    product: { id?: string; name: string };
    variant: {
      id?: string;
      price: { amount: number; currency: string };
    };
  }[];
  total: { amount: number; currency: string };
};

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const CART_KEY = "store-demo-cart-id";

export default function CheckoutSuccessPage() {
  const { clearCart } = useCart();
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const storedCart = window.localStorage.getItem("store-demo-cart");
      const cartId = window.localStorage.getItem(CART_KEY);
      if (!storedCart || !cartId) {
        setStatus("Missing cart or user details for order creation.");
        return;
      }
      try {
        const user = await fetch(`${apiBase}/auth/me`, {
          credentials: "include",
        })
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null);
        if (!user?.email) {
          setStatus("Please sign in to save your order.");
          return;
        }
        const cart = JSON.parse(storedCart) as Partial<StoredCart>;
        if (!cart.items?.length) {
          setStatus("Missing cart items for order creation.");
          return;
        }
        const orderFlagKey = `store-demo-order-${cartId}`;

        const items = cart.items
          .map((item) => {
            if (
              !item?.product?.name ||
              !item?.product?.id ||
              !item?.variant?.id ||
              !item?.variant?.price ||
              typeof item.variant.price.amount !== "number" ||
              !item.variant.price.currency
            ) {
              return null;
            }
            return {
              name: item.product.name,
              quantity: item.quantity,
              price: item.variant.price.amount,
              currency: item.variant.price.currency,
              productId: Number(item.product.id),
              variantId: Number(item.variant.id),
            };
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item));
        if (!items.length) {
          setStatus("Missing cart pricing details for order creation.");
          return;
        }

        const createOrder = async () => {
          const response = await fetch(`${apiBase}/orders/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cartId,
              items: items.map((item) => ({
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
              })),
            }),
            credentials: "include",
          });
          if (!response.ok) {
            const message = await response.text();
            throw new Error(message || "order failed");
          }
          window.localStorage.setItem(orderFlagKey, "true");
          clearCart();
        };

        if (!window.localStorage.getItem(orderFlagKey)) {
          createOrder().catch((err) => {
            console.error("Order create failed", err);
            setStatus(`Could not save the order: ${err.message}`);
          });
        } else {
          clearCart();
        }

        fetch(`${apiBase}/checkout/receipt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            items,
            total: cart.total?.amount ?? 0,
            currency: cart.total?.currency ?? "USD",
          }),
          credentials: "include",
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error("receipt failed");
            }
            setStatus("Receipt sent to your email.");
          })
          .catch(() => setStatus("Could not send receipt email."));
      } catch {
        setStatus("Could not send receipt email.");
      }
    };

    void run();
  }, []);

  return (
    <main className="mx-auto w-[min(700px,92%)] py-12">
      <h1 className="text-3xl font-semibold text-gray-900">
        Payment successful
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        Thanks for your order! You’ll receive a confirmation email shortly.
      </p>
      {status ? <p className="mt-4 text-sm text-gray-500">{status}</p> : null}
      <div className="mt-6">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
