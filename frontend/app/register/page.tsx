"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  findCountryByCode,
  getDefaultCountryCode,
  phoneCountries,
} from "@/lib/phoneCountries";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dialCode, setDialCode] = useState("+1");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const defaultCountry = findCountryByCode(getDefaultCountryCode());
    setDialCode(defaultCountry.dial);
  }, []);

  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordsMatch) {
      setStatus("Passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    setStatus(null);
    try {
      const response = await fetch(`${apiBase}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone: phone ? `${dialCode} ${phone}` : "",
          password,
        }),
      });
      if (!response.ok) {
        throw new Error("Registration failed");
      }
      setShowToast(true);
      setTimeout(() => {
        router.push("/signin");
      }, 1200);
    } catch {
      setStatus("Registration failed. Try a different email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto w-[min(500px,92%)] py-12">
      <h1 className="text-3xl font-semibold text-gray-900">Create account</h1>
      <p className="mt-2 text-sm text-gray-500">
        Buyer accounts let you follow stores and place orders.
      </p>
      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-gray-700">
            First name
            <input
              type="text"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-normal"
              placeholder="First name"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-gray-700">
            Last name
            <input
              type="text"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-normal"
              placeholder="Last name"
              required
            />
          </label>
        </div>
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
          Phone number (optional)
          <div className="flex gap-2">
            <select
              value={dialCode}
              onChange={(event) => setDialCode(event.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-normal"
            >
              {phoneCountries.map((country) => (
                <option key={country.code} value={country.dial}>
                  {country.flag} {country.dial} {country.name}
                </option>
              ))}
            </select>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-normal"
              placeholder="(555) 555-1234"
            />
          </div>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-gray-700">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-normal"
            placeholder="Create a password"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-gray-700">
          Re-enter password
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-normal"
            placeholder="Confirm your password"
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
          {isSubmitting ? "Registering..." : "Register"}
        </button>
      </form>

      {showToast ? (
        <div className="fixed bottom-6 right-6 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-lg">
          Successfully registered
        </div>
      ) : null}
    </main>
  );
}
