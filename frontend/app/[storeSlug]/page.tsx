import Image from "next/image";
import Link from "next/link";
import { gqlRequest } from "@/lib/graphql";
import { normalizeImageUrl } from "@/lib/images";
import { STORE_DETAIL_QUERY } from "@/queries/shopQueries";
import type { StoreResponse } from "@/types/shop";
import StoreFollowButton from "@/components/StoreFollowButton";

export default async function StorePage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const data = await gqlRequest<StoreResponse>(STORE_DETAIL_QUERY, {
    slug: storeSlug,
  });

  if (!data.storeBySlug) {
    return (
      <main className="mx-auto w-[min(1200px,92%)] py-12">
        <h1 className="text-2xl font-semibold text-gray-900">
          Store not found
        </h1>
      </main>
    );
  }

  return (
    <main className="mx-auto w-[min(1200px,92%)] py-12">
      <section className="grid gap-8 rounded-3xl border border-gray-200 bg-white p-8 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {data.storeBySlug.heroTitle}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-gray-900">
            {data.storeBySlug.name}
          </h1>
          <p className="mt-2 text-base text-gray-500">
            {data.storeBySlug.heroSubtitle}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-gray-600">
            <StoreFollowButton
              storeId={data.storeBySlug.id}
              initialFollowing={Boolean(data.storeBySlug.isFollowing)}
              initialFollowersCount={data.storeBySlug.followersCount}
            />
          </div>
        </div>
        <div className="relative aspect-4/3 overflow-hidden rounded-3xl">
          <Image
            src={normalizeImageUrl(data.storeBySlug.heroImage)}
            alt={data.storeBySlug.name}
            fill
            sizes="(max-width: 900px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      </section>

      <section className="py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-gray-900">Products</h2>
          <span className="text-sm text-gray-500">
            {data.storeBySlug.products.length} items
          </span>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.storeBySlug.products?.map((product) => (
            <Link
              key={product.id}
              href={`/${data.storeBySlug.slug}/item/${product.slug}`}
              className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:border-gray-300"
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
                <p className="text-base font-semibold text-gray-900">
                  {product.name}
                </p>
                <p className="text-sm text-gray-500">
                  ${Math.round(product.price.amount) / 100}{" "}
                  {product.price.currency}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
