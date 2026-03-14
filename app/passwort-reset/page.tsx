"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export default function PasswortResetPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) setError("Ungültiger oder fehlender Reset-Link.");
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen haben.");
      return;
    }

    if (password !== passwordConfirm) {
      setError("Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail ?? "Fehler beim Zurücksetzen");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err?.message ?? "Ein Fehler ist aufgetreten");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">

        <div className="mb-10 flex justify-center">
          <div className="relative h-28 w-72">
            <Image src="/logo.png" alt="Workplan Logo" fill className="object-contain" priority />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl/30">
          <div className="bg-green-700 px-6 py-5 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Workplan</h1>
          </div>

          <div className="px-6 py-7">
            {success ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
                  ✅
                </div>
                <h2 className="text-xl font-semibold text-slate-800">Passwort geändert</h2>
                <p className="mt-3 text-sm text-slate-500">
                  Dein Passwort wurde erfolgreich zurückgesetzt. Du kannst dich jetzt einloggen.
                </p>
                <Link
                  href="/"
                  className="mt-6 block w-full rounded-xl bg-green-700 px-4 py-3 text-center font-semibold text-white hover:bg-green-800"
                >
                  Zum Login
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-center text-xl font-semibold text-slate-800">
                  Neues Passwort setzen
                </h2>
                <p className="mt-2 text-center text-sm text-slate-500">
                  Mindestens 8 Zeichen.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Neues Passwort"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-slate-900 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 hover:text-slate-800"
                    >
                      {showPw ? "👁️" : "🙈"}
                    </button>
                  </div>

                  <input
                    type={showPw ? "text" : "password"}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="Passwort bestätigen"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
                  />

                  {error && (
                    <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !token}
                    className="w-full rounded-xl bg-green-700 px-4 py-3 font-semibold text-white shadow-md shadow-green-700/20 transition hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Speichert..." : "Passwort speichern"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-800">
            ← Zurück zum Login
          </Link>
          <p className="mt-6 text-xs text-zinc-400">
            © {new Date().getFullYear()} Workplan by Oswald-IT
          </p>
        </div>
      </div>
    </main>
  );
}
