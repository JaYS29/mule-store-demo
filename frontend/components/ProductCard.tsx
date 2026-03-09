import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { normalizeImageUrl } from "@/lib/images";

type Money = {
  amount: number;
  currency: string;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  storeName?: string;
  storeSlug?: string;
  price: Money;
};

export default function ProductCard({
  product,
  showStoreName = false,
}: {
  product: Product;
  showStoreName?: boolean;
}) {
  const productHref = product.storeSlug
    ? `/${product.storeSlug}/item/${product.slug}`
    : "/";
  return (
    <Link
      href={productHref}
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:border-gray-300"
    >
      <div className="relative aspect-4/3 bg-gray-100">
        <Image
          src={normalizeImageUrl(product.imageUrl)}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-5">
        {showStoreName && product.storeName ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {product.storeName}
          </p>
        ) : null}
        <p className="text-base font-semibold text-gray-900">{product.name}</p>
        <p className="text-sm text-gray-500">
          {formatMoney(product.price?.amount, product.price?.currency)}
        </p>
      </div>
    </Link>
  );
}
