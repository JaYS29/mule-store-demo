"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { gqlRequest } from "@/lib/graphql";
import {
  CREATE_STORE_PRODUCT_MUTATION,
  DELETE_STORE_PRODUCT_MUTATION,
  PRODUCT_TEMPLATES_QUERY,
  STORE_CATALOG_QUERY,
} from "@/queries/storeQueries";
import { formatMoney } from "@/lib/format";

type StoreCatalogResponse = {
  myStore: {
    id: string;
    slug: string;
    name: string;
    products: {
      id: string;
      name: string;
      slug: string;
      storeSlug?: string;
      imageUrl: string;
      variants: {
        id: string;
        name: string;
        sku: string;
        price: { amount: number; currency: string };
      }[];
    }[];
  } | null;
};

type ProductTemplateResponse = {
  productTemplates: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string;
    variants: {
      id: string;
      name: string;
      sku: string;
      price: { amount: number; currency: string };
    }[];
  }[];
};

type ProductInput = {
  name: string;
  slug: string;
  templateId: string;
  imageUrl: string;
};

export default function SetupProductsPage() {
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [products, setProducts] = useState<
    NonNullable<StoreCatalogResponse["myStore"]>["products"]
  >([]);
  const [templates, setTemplates] = useState<
    ProductTemplateResponse["productTemplates"]
  >([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [form, setForm] = useState<ProductInput>({
    name: "",
    slug: "",
    templateId: "",
    imageUrl: "",
  });
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === form.templateId),
    [form.templateId, templates]
  );

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const auth = await fetch(`${apiBase}/auth/me`, {
          credentials: "include",
        }).then((res) => (res.ok ? res.json() : null));
        if (!isMounted) return;
        const authenticated = Boolean(auth?.id);
        setIsAuthenticated(authenticated);
        if (!authenticated) return;

        try {
          const catalog = await gqlRequest<StoreCatalogResponse>(
            STORE_CATALOG_QUERY
          );
          if (!isMounted) return;
          if (catalog?.myStore) {
            setStoreId(catalog.myStore.id);
            setStoreName(catalog.myStore.name);
            setProducts(catalog.myStore.products ?? []);
          }
        } catch (err) {
          console.error("Load store catalog failed", err);
        }

        try {
          const templateData = await gqlRequest<ProductTemplateResponse>(
            PRODUCT_TEMPLATES_QUERY
          );
          if (!isMounted) return;
          setTemplates(templateData?.productTemplates ?? []);
        } catch (err) {
          console.error("Load product templates failed", err);
          if (isMounted) {
            setTemplates([]);
          }
        }
      } catch (err) {
        console.error("Load store catalog failed", err);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  const handleChange = (field: keyof ProductInput) => {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const name = event.target.value;
    const slug = slugify(name);
    setForm((prev) => ({ ...prev, name, slug }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!storeId) {
      setStatus("Create your store details first.");
      return;
    }
    if (!form.name || !form.slug || !form.templateId || !form.imageUrl) {
      setStatus("Fill out all fields before saving.");
      return;
    }
    setIsSaving(true);
    setStatus(null);
    try {
      await gqlRequest(CREATE_STORE_PRODUCT_MUTATION, {
        input: {
          storeId,
          templateProductId: form.templateId,
          name: form.name,
          slug: form.slug,
          imageUrl: form.imageUrl,
        },
      });
      const refreshed = await gqlRequest<StoreCatalogResponse>(
        STORE_CATALOG_QUERY
      );
      setProducts(refreshed.myStore?.products ?? []);
      setForm({
        name: "",
        slug: "",
        templateId: "",
        imageUrl: "",
      });
      setStatus("Product added.");
    } catch (err) {
      console.error("Create product failed", err);
      setStatus("Could not add product.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!window.confirm("Delete this product? This cannot be undone.")) {
      return;
    }
    setDeletingId(productId);
    setStatus(null);
    try {
      await gqlRequest(DELETE_STORE_PRODUCT_MUTATION, { productId });
      const refreshed = await gqlRequest<StoreCatalogResponse>(
        STORE_CATALOG_QUERY
      );
      setProducts(refreshed.myStore?.products ?? []);
    } catch (err) {
      console.error("Delete product failed", err);
      setStatus("Could not delete product.");
    } finally {
      setDeletingId(null);
    }
  };

  const templateVariants = selectedTemplate?.variants ?? [];

  const pricePreview = useMemo(() => {
    if (templateVariants.length === 0) return null;
    const lowest = [...templateVariants].sort(
      (a, b) => a.price.amount - b.price.amount
    )[0];
    return formatMoney(lowest.price.amount, lowest.price.currency);
  }, [templateVariants]);

  return (
    <main className="mx-auto w-[min(900px,92%)] py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Add products</h1>
          <p className="mt-2 text-sm text-gray-500">
            {storeName
              ? `Adding products for ${storeName}.`
              : "Create products from your catalog."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/setup/details"
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-gray-400"
          >
            Store details
          </Link>
        </div>
      </div>

      {isAuthenticated === false ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          <p>Sign in to add products.</p>
          <Link
            href="/signin"
            className="mt-4 inline-flex rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-gray-400"
          >
            Go to sign in
          </Link>
        </div>
      ) : !storeId ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          <p>Create your store details before adding products.</p>
          <Link
            href="/setup/details"
            className="mt-4 inline-flex rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-gray-400"
          >
            Go to store setup
          </Link>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-8 grid gap-4 rounded-2xl border border-gray-200 bg-white p-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-gray-700">
              Product name
              <input
                type="text"
                value={form.name}
                onChange={handleNameChange}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none"
                placeholder="Custom tote bag"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-gray-700">
              Product slug
              <input
                type="text"
                value={form.slug}
                readOnly
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 shadow-sm"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-semibold text-gray-700">
            Product type
            <select
              value={form.templateId}
              onChange={handleChange("templateId")}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none"
            >
              <option value="">Select a product type</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name.replace(/^custom\s+/i, "")}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-gray-700">
            Image URL
            <input
              type="url"
              value={form.imageUrl}
              onChange={handleChange("imageUrl")}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none"
              placeholder="https://images.example.com/product.jpg"
            />
          </label>
          {pricePreview ? (
            <p className="text-xs text-gray-500">
              Starting at {pricePreview} based on selected type.
            </p>
          ) : null}
          {status ? <p className="text-sm text-gray-500">{status}</p> : null}
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex w-full items-center justify-center rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-70"
          >
            {isSaving ? "Saving..." : "Add product"}
          </button>
        </form>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">
          Existing products
        </h2>
        {products.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No products yet.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {products.map((product) => (
              <div
                key={product.id}
                className="rounded-2xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500">/{product.slug}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(product.id)}
                    disabled={deletingId === product.id}
                    className="text-xs font-semibold text-red-500 transition hover:text-red-600 disabled:opacity-60"
                  >
                    {deletingId === product.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                  {product.variants.map((variant) => (
                    <span
                      key={variant.id}
                      className="rounded-full border border-gray-200 px-2 py-1"
                    >
                      {variant.name} ·{" "}
                      {formatMoney(
                        variant.price.amount,
                        variant.price.currency
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

const slugPattern = /[^a-z0-9]+/g;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(slugPattern, "-")
    .replace(/^-+|-+$/g, "");
}
