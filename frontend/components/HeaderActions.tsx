"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CartButton from "@/components/CartButton";

type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function HeaderActions() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const syncUser = () => {
      fetch(`${apiBase}/auth/me`, { credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.id) {
            setUser(data as AuthUser);
          } else {
            setUser(null);
          }
        })
        .catch(() => setUser(null));
    };

    syncUser();
    const handleAuthUpdate = () => syncUser();
    window.addEventListener("auth:updated", handleAuthUpdate);
    return () => {
      window.removeEventListener("auth:updated", handleAuthUpdate);
    };
  }, []);

  const handleLogout = () => {
    fetch(`${apiBase}/auth/logout`, { method: "POST", credentials: "include" })
      .catch(() => undefined)
      .finally(() => {
        setUser(null);
        setIsMenuOpen(false);
        window.dispatchEvent(new Event("auth:updated"));
        router.push("/");
      });
  };

  return (
    <div className="flex items-center gap-3">
      {user ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-gray-400"
            aria-label="Account menu"
          >
            <span aria-hidden="true">👤</span>
          </button>
          {isMenuOpen ? (
            <div className="absolute right-0 z-50 mt-2 w-40 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500">
                {user.firstName} {user.lastName}
              </div>
              <Link
                href="/profile"
                onClick={() => setIsMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                My profile
              </Link>
              <Link
                href="/orders"
                onClick={() => setIsMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                Orders
              </Link>
              <Link
                href="/setup"
                onClick={() => setIsMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                Set up store
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <Link
          href="/signin"
          className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-gray-400"
        >
          Sign in
        </Link>
      )}
      <CartButton />
    </div>
  );
}
