"use client";

import { usePathname, useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  if (
    pathname === "/" ||
    pathname === "/checkout/success" ||
    pathname === "/checkout/cancel"
  ) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:border-gray-400"
      aria-label="Go back"
    >
      <span aria-hidden="true">←</span>
      Go back
    </button>
  );
}
