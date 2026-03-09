import Image from "next/image";
import Link from "next/link";
import { gqlRequest } from "@/lib/graphql";
import { normalizeImageUrl } from "@/lib/images";
import { STORES_PAGE_QUERY } from "@/queries/shopQueries";
import type { StoresResponse } from "@/types/shop";

export default async function ShopsPage() {
  const data = await gqlRequest<StoresResponse>(STORES_PAGE_QUERY);

  return (
    <main className="mx-auto w-[min(1200px,92%)] py-12">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Browse the marketplace
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">All shops</h1>
        <p className="mt-2 text-base text-gray-500">
          Discover every store in the demo marketplace.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.stores.map((store) => (
          <Link
            key={store.id}
            href={`/${store.slug}`}
            className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:border-gray-300"
          >
            <div className="relative aspect-4/3 bg-gray-100">
              <Image
                src={normalizeImageUrl(store.heroImage)}
                alt={store.name}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-1 flex-col gap-2 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {store.heroTitle}
              </p>
              <p className="text-base font-semibold text-gray-900">
                {store.name}
              </p>
              <p className="text-sm text-gray-500">{store.heroSubtitle}</p>
              <p className="text-xs font-semibold text-gray-600">
                {store.followersCount} followers
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
