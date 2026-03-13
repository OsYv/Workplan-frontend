"use client";


import { useState } from "react";
import Image from "next/image";
import { api, setToken } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      await api.login(email, password, remember);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message);
    }
  }

return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        {/* Logo ohne Hintergrund */}
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

        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl/30">
          {/* Header bar */}
          <div className="bg-green-700 px-6 py-5 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Workplan
            </h1>
          </div>

          <div className="px-6 py-7">
            <h2 className="text-center text-xl font-semibold text-slate-800">
              Bei deinem Konto anmelden
            </h2>

            <form 
            onSubmit={handleLogin}
            className="mt-6 space-y-4"
            >
              {/* Email */}
              <div>
               {/*} <label className="mb-1 block text-sm font-medium text-slate-700">
                  Benutzer:
                </label>*/}
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

              {/* Passwort */}
              <div>
                {/*<label className="mb-1 block text-sm font-medium text-slate-700">
                  Passwort:
                </label>*/}

                <div className="relative">
                  <input
                    type="password"
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
          <label className="flex items-center gap-2 mb-4 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          Angemeldet bleiben
        </label>

              {/* Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-green-700 px-4 py-3 font-semibold text-white shadow-md shadow-green-700/20 transition hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Einloggen..." : "Einloggen"}
                </button>
              </div>

              {/* Msg */}
        {error && (
          <p className="mt-4 text-red-600 text-sm text-center">
            {error}
          </p>
              )}
            </form>
          </div>
        </div>

        {/* Footer link */}
        <div className="mt-6 text-center">
          <a
            href="#"
            className="text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            Passwort vergessen?
          </a>
         {/* Footer */}
        <p className="mt-6 text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} Workplan by Oswald-IT
        </p>
          
        </div>
      </div>
    </main>
  );
}