"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartContext";

export default function AddToCartButton({
  productId,
  variantId,
}: {
  productId: string;
  variantId: string;
}) {
  const { addToCart } = useCart();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await addToCart(productId, variantId, 1);
    } catch (err) {
      if (err instanceof Error && err.message === "login-required") {
        router.push("/signin");
        return;
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-2">
      <button
        className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? "Adding..." : "Add to cart"}
      </button>
    </div>
  );
}
