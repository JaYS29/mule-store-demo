"use client";

import { useEffect, useMemo, useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useCart } from "@/components/CartContext";
import { formatMoney } from "@/lib/format";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";
const CART_KEY = "store-demo-cart-id";

export default function CheckoutPage() {
  const { cart } = useCart();
  const [cartId, setCartId] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [paypalError, setPaypalError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCartId(window.localStorage.getItem(CART_KEY));
    fetch(`${apiBase}/auth/me`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((fresh) => {
        if (!fresh?.id) {
          setUser(null);
          return;
        }
        setUser({ id: fresh.id, email: fresh.email });
      })
      .catch(() => setUser(null));
  }, []);

  const totalAmount = useMemo(() => {
    const amount = cart?.total?.amount;
    if (typeof amount !== "number") return "0.00";
    return (amount / 100).toFixed(2);
  }, [cart]);

  const handleStripeCheckout = async () => {
    if (!cartId || !user) {
      setStripeError("Sign in to complete checkout.");
      return;
    }
    setIsStripeLoading(true);
    setStripeError(null);
    try {
      const response = await fetch(`${apiBase}/checkout/stripe/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartId,
          userId: Number(user.id),
          email: user.email,
        }),
      });
      if (!response.ok) {
        throw new Error("Stripe checkout failed");
      }
      const payload = (await response.json()) as { url: string };
      window.location.href = payload.url;
    } catch {
      setStripeError("Stripe checkout is unavailable right now.");
    } finally {
      setIsStripeLoading(false);
    }
  };

  return (
    <main className="mx-auto w-[min(900px,92%)] py-12">
      <h1 className="text-3xl font-semibold text-gray-900">Checkout</h1>
      <p className="mt-2 text-sm text-gray-500">
        Choose your preferred payment method.
      </p>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Payment options
          </h2>
          <div className="mt-4 grid gap-4">
            <button
              onClick={handleStripeCheckout}
              disabled={isStripeLoading || !user}
              className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-70"
            >
              {isStripeLoading ? "Redirecting..." : "Pay with Stripe"}
            </button>
            {stripeError ? (
              <p className="text-sm text-red-500">{stripeError}</p>
            ) : null}

            {!user ? (
              <p className="text-sm text-gray-500">
                Sign in to complete checkout.
              </p>
            ) : paypalClientId ? (
              <div className="rounded-2xl border border-gray-200 p-4">
                <PayPalScriptProvider
                  options={{
                    clientId: paypalClientId,
                    currency: "USD",
                    intent: "capture",
                  }}
                >
                  <PayPalButtons
                    style={{ layout: "vertical" }}
                    createOrder={(data, actions) =>
                      actions.order.create({
                        intent: "CAPTURE",
                        purchase_units: [
                          {
                            amount: {
                              currency_code: "USD",
                              value: totalAmount,
                            },
                          },
                        ],
                      })
                    }
                    onApprove={(data, actions) => {
                      if (!actions.order) {
                        return Promise.resolve();
                      }
                      return actions.order.capture().then(async () => {
                        if (!cartId || !user) return;
                        try {
                          const response = await fetch(
                            `${apiBase}/orders/create`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                cartId,
                              }),
                              credentials: "include",
                            }
                          );
                          if (!response.ok) {
                            const message = await response.text();
                            throw new Error(message || "order failed");
                          }
                          window.location.href = "/checkout/success";
                        } catch (err) {
                          console.error("PayPal order create failed", err);
                          setPaypalError(
                            "Could not finalize your PayPal order."
                          );
                        }
                      });
                    }}
                    onCancel={() => {
                      setPaypalError("PayPal checkout was canceled.");
                    }}
                    onError={(err) => {
                      console.error("PayPal SDK error", err);
                      setPaypalError(
                        "PayPal checkout failed. Please try again."
                      );
                    }}
                  />
                </PayPalScriptProvider>
              </div>
            ) : (
              <p className="text-sm text-gray-500">PayPal is not configured.</p>
            )}
            {paypalError ? (
              <p className="text-sm text-red-500">{paypalError}</p>
            ) : null}
          </div>
        </div>

        <aside className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Order summary</h2>
          {cart?.items?.length ? (
            <div className="mt-4 grid gap-3 text-sm text-gray-600">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between"
                >
                  <span>
                    {item.product.name} × {item.quantity}
                  </span>
                  <span>
                    {formatMoney(
                      item.lineTotal?.amount,
                      item.lineTotal?.currency
                    )}
                  </span>
                </div>
              ))}
              <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3 text-base font-semibold text-gray-900">
                <span>Total</span>
                <span>
                  {formatMoney(cart.total?.amount, cart.total?.currency)}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">Your cart is empty.</p>
          )}
        </aside>
      </section>
    </main>
  );
}
