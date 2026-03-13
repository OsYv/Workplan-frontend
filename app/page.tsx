"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { api } from "@/lib/api";
import { getHomeRouteForRole } from "@/lib/auth";

type MeUser = {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  email: string;
  role?: string | null;
  is_active: boolean;
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function redirectAfterLogin(user: MeUser) {
    window.location.href = getHomeRouteForRole(user.role);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.login(email, password, remember);
      const me = await api.me();
      redirectAfterLogin(me);
    } catch (err: any) {
      setError(err?.message ?? "Login fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function checkExistingSession() {
      try {
        const me = await api.me();
        if (!active) return;
        redirectAfterLogin(me);
      } catch {
        if (!active) return;
        setCheckingSession(false);
      }
    }

    checkExistingSession();

    return () => {
      active = false;
    };
  }, []);

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-5 py-10">
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-xl/30">
            Sitzung wird geprüft...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <div className="mb-10 flex justify-center">
          <div className="relative h-28 w-72">
            <Image
              src="/logo.png"
              alt="Workplan Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl/30">
          <div className="bg-green-700 px-6 py-5 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Workplan
            </h1>
          </div>

          <div className="px-6 py-7">
            <h2 className="text-center text-xl font-semibold text-slate-800">
              Bei deinem Konto anmelden
            </h2>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-Mail-Adresse"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
                  required
                />
              </div>

              <div>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Passwort"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-slate-900 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 hover:text-slate-800"
                    aria-label={showPw ? "Passwort verbergen" : "Passwort anzeigen"}
                  >
                    {showPw ? "👁️" : "🙈"}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-green-700 focus:ring-green-200"
                />
                Angemeldet bleiben
              </label>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-green-700 px-4 py-3 font-semibold text-white shadow-md shadow-green-700/20 transition hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Einloggen..." : "Einloggen"}
                </button>
              </div>

              {error && (
                <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
                  {error}
                </p>
              )}
            </form>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a
            href="#"
            className="text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            Passwort vergessen?
          </a>

          <p className="mt-6 text-center text-xs text-zinc-400">
            © {new Date().getFullYear()} Workplan by Oswald-IT
          </p>
        </div>
      </div>
    </main>
  );
}