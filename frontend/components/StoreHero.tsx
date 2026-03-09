import Image from "next/image";
import Link from "next/link";
import { normalizeImageUrl } from "@/lib/images";

type Store = {
  name: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
};

export default function StoreHero({ store }: { store: Store }) {
  return (
    <section className="py-14 pb-10">
      <div className="grid gap-8 rounded-3xl border border-gray-200 bg-white p-8 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="inline-flex rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            Store demo
          </span>
          <h1 className="mt-4 text-3xl font-semibold text-gray-900 sm:text-4xl">
            {store.heroTitle}
          </h1>
          <p className="mt-2 text-base text-gray-500 sm:text-lg">
            {store.heroSubtitle}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/setup"
              className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Set up your store
            </Link>
            <Link href="/shops">
              <button className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-900 transition hover:border-gray-400">
                Shop the marketplace
              </button>
            </Link>
          </div>
        </div>
        <div className="relative aspect-4/3 overflow-hidden rounded-3xl">
          <Image
            src={normalizeImageUrl(store.heroImage)}
            alt={store.name}
            fill
            sizes="(max-width: 900px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
