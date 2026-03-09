import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <main className="mx-auto w-[min(700px,92%)] py-12">
      <h1 className="text-3xl font-semibold text-gray-900">Checkout canceled</h1>
      <p className="mt-2 text-sm text-gray-500">
        Your payment was not completed. You can try again when you’re ready.
      </p>
      <Link
        href="/checkout"
        className="mt-4 inline-flex rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400"
      >
        Return to checkout
      </Link>
    </main>
  );
}
