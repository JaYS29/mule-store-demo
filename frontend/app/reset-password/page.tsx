"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      setStatus("Missing reset token.");
      return;
    }
    if (!passwordsMatch) {
      setStatus("Passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    setStatus(null);
    try {
      const response = await fetch(`${apiBase}/auth/password-reset/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!response.ok) {
        throw new Error("Reset failed");
      }
      router.push("/signin");
    } catch {
      setStatus("Reset link is invalid or expired.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto w-[min(500px,92%)] py-12">
      <h1 className="text-3xl font-semibold text-gray-900">Reset password</h1>
      <p className="mt-2 text-sm text-gray-500">
        Choose a new password for your account.
      </p>
      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm font-semibold text-gray-700">
          New password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-normal"
            placeholder="Enter a new password"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-gray-700">
          Confirm password
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-normal"
            placeholder="Re-enter your password"
            required
          />
        </label>
        <p className="text-sm font-semibold text-gray-600">
          {password.length === 0 && confirmPassword.length === 0
            ? "Passwords must match."
            : passwordsMatch
            ? "Passwords match."
            : "Passwords do not match."}
        </p>
        {status ? <p className="text-sm text-red-500">{status}</p> : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-70"
        >
          {isSubmitting ? "Updating..." : "Update password"}
        </button>
      </form>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
