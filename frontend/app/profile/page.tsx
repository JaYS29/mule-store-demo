"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  findCountryByCode,
  findCountryByDial,
  getDefaultCountryCode,
  phoneCountries,
} from "@/lib/phoneCountries";

type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
};

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [dialCode, setDialCode] = useState("+1");
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    fetch(`${apiBase}/auth/me`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((parsed) => {
        if (!parsed?.id) {
          router.push("/signin");
          return;
        }
        setUser(parsed as AuthUser);
        setFirstName(parsed.firstName);
        setLastName(parsed.lastName);
        const storedPhone = parsed.phone ?? "";
        const match = storedPhone ? findCountryByDial(storedPhone) : null;
        if (match) {
          setDialCode(match.dial);
          setPhone(storedPhone.replace(match.dial, "").trim());
        } else {
          const defaultCountry = findCountryByCode(getDefaultCountryCode());
          setDialCode(defaultCountry.dial);
          setPhone(storedPhone);
        }
      })
      .catch(() => router.push("/signin"));
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const syncFromStorage = () => {
      fetch(`${apiBase}/auth/me`, { credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .then((parsed) => {
          if (!parsed?.id) return;
          const storedPhone = parsed.phone ?? "";
          const match = storedPhone ? findCountryByDial(storedPhone) : null;
          if (match) {
            setDialCode(match.dial);
            setPhone(storedPhone.replace(match.dial, "").trim());
          } else if (storedPhone) {
            setPhone(storedPhone);
          }
        })
        .catch(() => undefined);
    };

    const handleAuthUpdate = () => syncFromStorage();
    window.addEventListener("auth:updated", handleAuthUpdate);
    return () => window.removeEventListener("auth:updated", handleAuthUpdate);
  }, [user]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setStatus(null);
    try {
      const response = await fetch(`${apiBase}/auth/profile/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phone: phone ? `${dialCode} ${phone}` : "",
        }),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("update failed");
      }
      window.dispatchEvent(new Event("auth:updated"));
      setStatus("Profile updated.");
    } catch {
      setStatus("Could not update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    if (newPassword !== confirmPassword) {
      setPasswordStatus("Passwords do not match.");
      return;
    }
    setIsUpdatingPassword(true);
    setPasswordStatus(null);
    try {
      const response = await fetch(`${apiBase}/auth/password/change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("update failed");
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordStatus("Password updated.");
    } catch {
      setPasswordStatus("Current password is incorrect.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogout = () => {
    fetch(`${apiBase}/auth/logout`, { method: "POST", credentials: "include" })
      .catch(() => undefined)
      .finally(() => {
        window.dispatchEvent(new Event("auth:updated"));
        router.push("/");
      });
  };

  if (!user) return null;

  return (
    <main className="mx-auto w-[min(700px,92%)] py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold text-gray-900">My profile</h1>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400"
        >
          Logout
        </button>
      </div>

      <form className="mt-6 grid gap-4" onSubmit={handleSave}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-gray-700">
            First name
            <input
              type="text"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-normal"
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
              required
            />
          </label>
        </div>
        <label className="grid gap-2 text-sm font-semibold text-gray-700">
          Email
          <input
            type="email"
            value={user?.email ?? ""}
            className="rounded-xl border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-normal text-gray-600"
            disabled
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
            />
          </div>
        </label>
        {status ? <p className="text-sm text-gray-600">{status}</p> : null}
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-70"
        >
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      </form>

      <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Change password</h2>
        <form className="mt-4 grid gap-4" onSubmit={handlePasswordChange}>
          <label className="grid gap-2 text-sm font-semibold text-gray-700">
            Current password
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-normal"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-gray-700">
            New password
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-normal"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-gray-700">
            Confirm new password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-normal"
              required
            />
          </label>
          {passwordStatus ? (
            <p className="text-sm text-gray-600">{passwordStatus}</p>
          ) : null}
          <button
            type="submit"
            disabled={isUpdatingPassword}
            className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-70"
          >
            {isUpdatingPassword ? "Updating..." : "Update password"}
          </button>
        </form>
      </section>
    </main>
  );
}
