"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";
import { useCart } from "@/components/CartContext";

type OrderItem = {
  id: number;
  productName: string;
  variantName: string;
  quantity: number;
  lineTotal: number;
  imageURL: string;
};

type Order = {
  id: number;
  total: { amount: number; currency: string };
  createdAt: string;
  items: OrderItem[];
};

type ApiOrderItem = {
  ID: number;
  ProductName: string;
  VariantName: string;
  Quantity: number;
  LineTotal: number;
  ImageURL: string;
};

type ApiOrder = {
  ID: number;
  Total: { amount: number; currency: string };
  CreatedAt: string;
  Items: ApiOrderItem[];
};

type ApiMoney = {
  amount?: number;
  currency?: string;
  Amount?: number;
  Currency?: string;
};

type ApiCartItem = {
  ID?: string;
  Quantity?: number;
  LineTotal?: ApiMoney;
  lineTotal?: ApiMoney;
  Product?: {
    ID?: number;
    Name?: string;
    Slug?: string;
    ImageURL?: string;
    StoreName?: string;
    Price?: ApiMoney;
  };
  Variant?: {
    ID?: number;
    Name?: string;
    SKU?: string;
    Price?: ApiMoney;
  };
};

type ApiCart = {
  ID?: string;
  Items?: ApiCartItem[];
  Subtotal?: ApiMoney;
  Total?: ApiMoney;
};

const normalizeMoney = (money?: ApiMoney) => ({
  amount: money?.amount ?? money?.Amount ?? 0,
  currency: money?.currency ?? money?.Currency ?? "USD",
});

const normalizeCart = (cart: ApiCart) => ({
  id: cart.ID ?? "",
  items: (cart.Items ?? []).map((item) => ({
    id: item.ID ?? "",
    quantity: item.Quantity ?? 0,
    lineTotal: normalizeMoney(item.lineTotal ?? item.LineTotal),
    product: {
      id: String(item.Product?.ID ?? ""),
      name: item.Product?.Name ?? "",
      slug: item.Product?.Slug ?? "",
      imageUrl: item.Product?.ImageURL ?? "",
      storeName: item.Product?.StoreName,
      price: normalizeMoney(item.Product?.Price),
    },
    variant: {
      id: String(item.Variant?.ID ?? ""),
      name: item.Variant?.Name ?? "",
      sku: item.Variant?.SKU ?? "",
      price: normalizeMoney(item.Variant?.Price),
    },
  })),
  subtotal: normalizeMoney(cart.Subtotal),
  total: normalizeMoney(cart.Total),
});

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function OrdersPage() {
  const { replaceCart, openCart } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiBase}/auth/me`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => {
        if (!user?.id) {
          setStatus("Please sign in to view your orders.");
          return null;
        }
        return fetch(`${apiBase}/orders`, { credentials: "include" });
      })
      .then(async (res) => {
        if (!res) return null;
        if (!res.ok) {
          const message = await res.text();
          throw new Error(message || "orders fetch failed");
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        const mapped = (data.orders ?? []).map((order: ApiOrder) => ({
          id: order.ID,
          total: order.Total,
          createdAt: order.CreatedAt,
          items: (order.Items ?? []).map((item) => ({
            id: item.ID,
            productName: item.ProductName,
            variantName: item.VariantName,
            quantity: item.Quantity,
            lineTotal: item.LineTotal,
            imageURL: item.ImageURL,
          })),
        }));
        setStatus(null);
        setOrders(mapped);
      })
      .catch((err) => {
        console.error("Orders fetch failed", err);
        setStatus("Could not load orders.");
      });
  }, []);

  const handleRepeat = async (orderId: number) => {
    try {
      const response = await fetch(`${apiBase}/orders/repeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("repeat failed");
      }
      const cart = (await response.json()) as ApiCart;
      replaceCart(normalizeCart(cart));
      openCart();
    } catch {
      setStatus("Could not repeat the order.");
    }
  };

  return (
    <main className="mx-auto w-[min(900px,92%)] py-12">
      <h1 className="text-3xl font-semibold text-gray-900">Orders</h1>
      {status ? <p className="mt-2 text-sm text-gray-500">{status}</p> : null}
      {orders.length === 0 && !status ? (
        <p className="mt-6 text-sm text-gray-500">No orders yet.</p>
      ) : (
        <div className="mt-6 grid gap-6">
          {orders.map((order, orderIndex) => (
            <div
              key={order.id ?? `order-${orderIndex}`}
              className="rounded-2xl border border-gray-200 bg-white p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Order #{order.id}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(() => {
                      const parsed = new Date(order.createdAt);
                      if (Number.isNaN(parsed.getTime())) {
                        return "Date unavailable";
                      }
                      return parsed.toLocaleString();
                    })()}
                  </p>
                </div>
                <button
                  className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400"
                  onClick={() => handleRepeat(order.id)}
                >
                  Repeat order
                </button>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-gray-600">
                {(order.items ?? []).map((item, itemIndex) => (
                  <div
                    key={
                      item.id ?? `${order.id ?? orderIndex}-item-${itemIndex}`
                    }
                    className="flex items-center justify-between"
                  >
                    <span>
                      {item.productName} · {item.variantName} × {item.quantity}
                    </span>
                    <span>
                      {formatMoney(item.lineTotal, order.total?.currency)}
                    </span>
                  </div>
                ))}
                <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-3 text-base font-semibold text-gray-900">
                  <span>Total</span>
                  <span>
                    {formatMoney(order.total?.amount, order.total?.currency)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
