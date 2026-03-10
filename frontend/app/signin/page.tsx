"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [loginStatus, setLoginStatus] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();

  const handleResetSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmittingReset(true);
    setResetStatus(null);
    try {
      const response = await fetch(`${apiBase}/auth/password-reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Reset request failed");
      }
      setResetStatus("If the email exists, a reset link is on its way.");
    } catch {
      setResetStatus("Something went wrong. Please try again.");
    } finally {
      setIsSubmittingReset(false);
    }
  };

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoggingIn(true);
    setLoginStatus(null);
    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Invalid credentials");
      }
      (await response.json()) as {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
      };
      window.dispatchEvent(new Event("auth:updated"));
      router.push("/");
    } catch {
      setLoginStatus("Invalid email or password.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <main className="mx-auto w-[min(500px,92%)] py-12">
      <h1 className="text-3xl font-semibold text-gray-900">Sign in</h1>
      <p className="mt-2 text-sm text-gray-500">
        Use your email and password to access your account.
      </p>
      <form className="mt-6 grid gap-4" onSubmit={handleSignIn}>
        <label className="grid gap-2 text-sm font-semibold text-gray-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-normal"
            placeholder="you@example.com"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-gray-700">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-normal"
            placeholder="Enter your password"
            required
          />
        </label>
        {loginStatus ? (
          <p className="text-sm text-red-500">{loginStatus}</p>
        ) : null}
        <button
          type="submit"
          disabled={isLoggingIn}
          className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-70"
        >
          {isLoggingIn ? "Signing in..." : "Sign in"}
        </button>
        <button
          type="button"
          onClick={() => {
            setResetStatus(null);
            setResetEmail(email);
            setIsResetOpen(true);
          }}
          className="text-left text-sm font-semibold text-gray-600 hover:text-gray-800"
        >
          Forgot my password
        </button>
        <a
          href="/register"
          className="text-left text-sm font-semibold text-gray-600 hover:text-gray-800"
        >
          Don&apos;t have an account
        </a>
      </form>

      {isResetOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Reset password
              </h2>
              <button
                type="button"
                onClick={() => setIsResetOpen(false)}
                className="text-sm font-semibold text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Enter the email you used to create your account.
            </p>
            <form className="mt-4 grid gap-4" onSubmit={handleResetSubmit}>
              <label className="grid gap-2 text-sm font-semibold text-gray-700">
                Email
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(event) => setResetEmail(event.target.value)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-normal"
                  placeholder="you@example.com"
                  required
                />
              </label>
              {resetStatus ? (
                <p className="text-sm text-gray-600">{resetStatus}</p>
              ) : null}
              <button
                type="submit"
                disabled={isSubmittingReset}
                className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-70"
              >
                {isSubmittingReset ? "Sending..." : "Send reset link"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
