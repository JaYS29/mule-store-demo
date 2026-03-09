"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { gqlRequest } from "@/lib/graphql";
import { STORE_SETUP_QUERY } from "@/queries/storeQueries";

type StoreSetupResponse = {
  myStore: {
    id: string;
    name: string;
    heroTitle: string;
    heroSubtitle: string;
    heroImage: string;
  } | null;
};

export default function StoreSetupPage() {
  const [store, setStore] = useState<StoreSetupResponse["myStore"]>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

  useEffect(() => {
    let isMounted = true;
    fetch(`${apiBase}/auth/me`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        const authenticated = Boolean(data?.id);
        setIsAuthenticated(authenticated);
        if (!authenticated) return;
        return gqlRequest<StoreSetupResponse>(STORE_SETUP_QUERY);
      })
      .then((data) => {
        if (!isMounted) return;
        setStore(data?.myStore ?? null);
      })
      .catch(() => {
        if (!isMounted) return;
        setStore(null);
      });
    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  return (
    <main className="mx-auto w-[min(680px,92%)] py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold text-gray-900">Store setup</h1>
        <Link
          href="/"
          className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-gray-400"
        >
          Back to home
        </Link>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        Manage your store basics and product catalog.
      </p>

      {isAuthenticated === false ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          <p>Sign in to manage your store.</p>
          <Link
            href="/signin"
            className="mt-4 inline-flex rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-gray-400"
          >
            Go to sign in
          </Link>
        </div>
      ) : store ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="relative h-40 w-full bg-gray-100">
            <img
              src={store.heroImage}
              alt={store.name || "Store hero"}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="grid gap-2 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {store.name}
            </p>
            <h2 className="text-lg font-semibold text-gray-900">
              {store.heroTitle}
            </h2>
            <p className="text-sm text-gray-500">{store.heroSubtitle}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/setup/details"
                className="inline-flex w-fit rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Edit store details
              </Link>
              <Link
                href="/setup/products"
                className="inline-flex w-fit rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-gray-400"
              >
                Manage products
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          <p>Get started by adding your store details.</p>
          <Link
            href="/setup/details"
            className="mt-4 inline-flex rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Set up store
          </Link>
        </div>
      )}
    </main>
  );
}
