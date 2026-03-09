import Image from "next/image";
import Link from "next/link";
import { gqlRequest } from "@/lib/graphql";
import StoreHero from "@/components/StoreHero";
import { normalizeImageUrl } from "@/lib/images";
import { STORE_PAGE_QUERY } from "@/queries/storeQueries";
import type { StoreResponse } from "@/types/store";

export default async function HomePage() {
  const data = await gqlRequest<StoreResponse>(STORE_PAGE_QUERY);
  const popularStores = data.stores
    .filter((store) => store.id !== data.store.id)
    .slice(0, 3);

  return (
    <main>
      <div className="mx-auto w-[min(1200px,92%)]">
        <StoreHero store={data.store} />
        <section className="py-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-gray-900">
              Popular stores
            </h2>
            <Link
              href="/shops"
              className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-gray-400"
            >
              Show all
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {popularStores.map((store) => (
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
        </section>
      </div>
      <section className="bg-gray-900 py-12 text-white">
        <div className="mx-auto grid w-[min(1200px,92%)] gap-6 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <h3 className="text-base font-semibold">
              Orders ship automatically
            </h3>
            <p className="mt-2 text-gray-300">
              We take care of production, shipping, and support.
            </p>
          </div>
          <div>
            <h3 className="text-base font-semibold">Markup to make money</h3>
            <p className="mt-2 text-gray-300">
              Set your price and keep the profit on every sale.
            </p>
          </div>
          <div>
            <h3 className="text-base font-semibold">Earn with commissions</h3>
            <p className="mt-2 text-gray-300">
              Invite new customers and earn extra rewards.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
