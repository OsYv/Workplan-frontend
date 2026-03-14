"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export default function PasswortVergessenPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail ?? "Fehler beim Senden");
      }

      setSent(true);
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
            {sent ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
                  ✅
                </div>
                <h2 className="text-xl font-semibold text-slate-800">E-Mail gesendet</h2>
                <p className="mt-3 text-sm text-slate-500">
                  Falls die E-Mail-Adresse in unserem System existiert, haben wir dir einen Link zum Zurücksetzen des Passworts gesendet.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Der Link ist <strong>60 Minuten</strong> gültig.
                </p>
                <Link
                  href="/"
                  className="mt-6 block w-full rounded-xl bg-green-700 px-4 py-3 text-center font-semibold text-white hover:bg-green-800"
                >
                  Zurück zum Login
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-center text-xl font-semibold text-slate-800">
                  Passwort zurücksetzen
                </h2>
                <p className="mt-2 text-center text-sm text-slate-500">
                  Gib deine E-Mail-Adresse ein und wir senden dir einen Reset-Link.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="E-Mail-Adresse"
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
                    disabled={loading}
                    className="w-full rounded-xl bg-green-700 px-4 py-3 font-semibold text-white shadow-md shadow-green-700/20 transition hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Senden..." : "Reset-Link senden"}
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
