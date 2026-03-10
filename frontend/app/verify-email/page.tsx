"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [status, setStatus] = useState<string | null>(null);
  const [hasVerified, setHasVerified] = useState(false);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        return;
      }
      try {
        const response = await fetch(`${apiBase}/auth/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!response.ok) {
          throw new Error("Verification failed");
        }
        setHasVerified(true);
        setStatus("Email verified.");
        setTimeout(() => router.push("/signin"), 1400);
      } catch {
        setStatus("Verification link is invalid or expired.");
      }
    };
    setStatus(null);
    setHasVerified(false);
    verify();
  }, [token, router]);

  return (
    <main className="mx-auto w-[min(520px,92%)] py-12">
      <h1 className="text-3xl font-semibold text-gray-900">Verify email</h1>
      <p className="mt-2 text-sm text-gray-500">
        We are confirming your email address.
      </p>
      {status ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
          {status}
        </div>
      ) : null}
      {hasVerified ? (
        <div className="fixed bottom-6 right-6 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-lg">
          Email has been verified
        </div>
      ) : null}
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
