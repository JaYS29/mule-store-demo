"use client";

import { useState } from "react";
import AddToCartButton from "@/components/AddToCartButton";
import { formatMoney } from "@/lib/format";

type Money = {
  amount: number;
  currency: string;
};

type Variant = {
  id: string;
  name: string;
  sku: string;
  price: Money;
};

export default function VariantSelector({
  productId,
  variants,
}: {
  productId: string;
  variants: Variant[];
}) {
  const [selected, setSelected] = useState(variants[0]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-3">
        {variants.map((variant) => (
          <button
            key={variant.id}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              variant.id === selected.id
                ? "border-gray-900 text-gray-900"
                : "border-gray-300 text-gray-600 hover:border-gray-400"
            }`}
            onClick={() => setSelected(variant)}
          >
            {variant.name} ·{" "}
            {formatMoney(variant.price?.amount, variant.price?.currency)}
          </button>
        ))}
      </div>
      <AddToCartButton productId={productId} variantId={selected.id} />
    </div>
  );
}
