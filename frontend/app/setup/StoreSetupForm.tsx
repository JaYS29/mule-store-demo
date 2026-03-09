"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { gqlRequest } from "@/lib/graphql";
import {
  CREATE_STORE_MUTATION,
  STORE_SETUP_QUERY,
  UPDATE_STORE_MUTATION,
} from "@/queries/storeQueries";

type StoreSetupResponse = {
  myStore: {
    id: string;
    name: string;
    heroTitle: string;
    heroSubtitle: string;
    heroImage: string;
  } | null;
};

type StoreInput = {
  name: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
};

export default function StoreSetupForm() {
  const [storeId, setStoreId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [form, setForm] = useState<StoreInput>({
    name: "",
    heroTitle: "",
    heroSubtitle: "",
    heroImage: "",
  });
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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
        if (!isMounted || !data?.myStore) return;
        setStoreId(data.myStore.id);
        setForm({
          name: data.myStore.name ?? "",
          heroTitle: data.myStore.heroTitle ?? "",
          heroSubtitle: data.myStore.heroSubtitle ?? "",
          heroImage: data.myStore.heroImage ?? "",
        });
      })
      .catch(() => {
        if (!isMounted) return;
        setStoreId(null);
      });
    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  const handleChange = (field: keyof StoreInput) => {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !form.name ||
      !form.heroTitle ||
      !form.heroSubtitle ||
      !form.heroImage
    ) {
      setStatus("Fill out all fields before saving.");
      return;
    }
    setIsSaving(true);
    setStatus(null);
    try {
      if (storeId) {
        await gqlRequest(UPDATE_STORE_MUTATION, {
          id: storeId,
          input: form,
        });
      } else {
        const data = await gqlRequest<{ createStore: { id: string } }>(
          CREATE_STORE_MUTATION,
          { input: form }
        );
        setStoreId(data.createStore.id);
      }
      setStatus("Store details saved.");
    } catch (err) {
      console.error("Store setup failed", err);
      const message =
        err instanceof Error ? err.message : "Could not save store details.";
      setStatus(message || "Could not save store details.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto w-[min(680px,92%)] py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold text-gray-900">
          Set up your store
        </h1>
        {!storeId ? (
          <Link
            href="/"
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-gray-400"
          >
            Back to home
          </Link>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-gray-500">
        Add the basics customers will see on your storefront.
      </p>

      {storeId ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="relative h-40 w-full bg-gray-100">
            <img
              src={form.heroImage}
              alt={form.name || "Store hero"}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="grid gap-2 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {form.name}
            </p>
            <h2 className="text-lg font-semibold text-gray-900">
              {form.heroTitle}
            </h2>
            <p className="text-sm text-gray-500">{form.heroSubtitle}</p>
            <Link
              href="/setup/products"
              className="mt-3 inline-flex w-fit rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Manage products
            </Link>
          </div>
        </div>
      ) : null}

      {isAuthenticated === false ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          <p>Sign in to set up your store.</p>
          <Link
            href="/signin"
            className="mt-4 inline-flex rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-gray-400"
          >
            Go to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
          <label className="grid gap-2 text-sm font-semibold text-gray-700">
            Store name
            <input
              type="text"
              value={form.name}
              onChange={handleChange("name")}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none"
              placeholder="Sunny Goods"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-gray-700">
            Hero title
            <input
              type="text"
              value={form.heroTitle}
              onChange={handleChange("heroTitle")}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none"
              placeholder="Custom merch that ships fast"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-gray-700">
            Hero subtitle
            <textarea
              rows={3}
              value={form.heroSubtitle}
              onChange={handleChange("heroSubtitle")}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none"
              placeholder="Tell customers what makes your store unique."
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-gray-700">
            Hero image URL
            <input
              type="url"
              value={form.heroImage}
              onChange={handleChange("heroImage")}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none"
              placeholder="https://images.example.com/banner.jpg"
            />
          </label>
          {status ? <p className="text-sm text-gray-500">{status}</p> : null}
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex w-full items-center justify-center rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-70"
          >
            {isSaving ? "Saving..." : storeId ? "Save changes" : "Save store"}
          </button>
        </form>
      )}
    </main>
  );
}
