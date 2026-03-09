import Image from "next/image";
import { gqlRequest } from "@/lib/graphql";
import { formatMoney } from "@/lib/format";
import { normalizeImageUrl } from "@/lib/images";
import VariantSelector from "@/components/VariantSelector";

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

type Product = {
  id: string;
  storeName: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  price: Money;
  variants: Variant[];
};

type ProductResponse = {
  productByStoreSlug: Product | null;
};

const productQuery = `
  query ProductByStoreSlug($storeSlug: String!, $productSlug: String!) {
    productByStoreSlug(storeSlug: $storeSlug, productSlug: $productSlug) {
      id
      storeName
      name
      slug
      description
      imageUrl
      price { amount currency }
      variants { id name sku price { amount currency } }
    }
  }
`;

export default async function ProductPage({
  params,
}: {
  params: Promise<{ storeSlug: string; productSlug: string }>;
}) {
  const { storeSlug, productSlug } = await params;
  const data = await gqlRequest<ProductResponse>(productQuery, {
    storeSlug,
    productSlug,
  });

  if (!data.productByStoreSlug) {
    return (
      <main className="mx-auto w-[min(1200px,92%)] py-12">
        <h1 className="text-2xl font-semibold text-gray-900">
          Product not found
        </h1>
      </main>
    );
  }

  return (
    <main className="mx-auto w-[min(1200px,92%)] py-12">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="relative aspect-4/3 overflow-hidden rounded-3xl">
          <Image
            src={normalizeImageUrl(data.productByStoreSlug.imageUrl)}
            alt={data.productByStoreSlug.name}
            fill
            sizes="(max-width: 900px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <div className="grid gap-4">
          <h1 className="text-3xl font-semibold text-gray-900">
            {data.productByStoreSlug.name}
          </h1>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {data.productByStoreSlug.storeName}
          </p>
          <p className="text-base text-gray-500">
            {data.productByStoreSlug.description}
          </p>
          <p className="text-base font-semibold text-gray-900">
            Starting at{" "}
            {formatMoney(
              data.productByStoreSlug.price.amount,
              data.productByStoreSlug.price.currency
            )}
          </p>
          <VariantSelector
            productId={data.productByStoreSlug.id}
            variants={data.productByStoreSlug.variants}
          />
        </div>
      </div>
    </main>
  );
}
