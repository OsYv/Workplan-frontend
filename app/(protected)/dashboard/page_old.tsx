"use client";

import { useEffect, useMemo, useState } from "react";
import { api, clearToken } from "@/lib/api";

type ClockState = {
  isClockedIn: boolean;
  clockInAt?: string | null;
  clockOutAt?: string | null;
  breakMinutesApplied?: number | null;
  status?: string | null;
  source?: string | null;
};

function diffSecondsFrom(clockInIso?: string | null) {
  if (!clockInIso) return 0;
  const start = new Date(clockInIso).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - start);
  return Math.floor(diffMs / 1000);
}

function formatHHMMSS(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function formatLocal(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function Badge({ variant, children }: { variant: "green" | "slate" | "red" | "orange"; children: React.ReactNode }) {
  const cls =
        variant === "green"
      ? "bg-green-50 text-green-800 ring-green-200"
      : variant === "red"
      ? "bg-red-50 text-red-800 ring-red-200"
      : variant === "slate"
      ?"bg-slate-100 text-slate-700 ring-slate-200"
      :"bg-orange-100 text-orange-800 ring-orange-200";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${cls}`}>
      {children}
    </span>
  );
}

export default function DashboardPage() {
  const [state, setState] = useState<ClockState>({ isClockedIn: false });
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function loadStatus() {
    const s: any = await api.status();

    if (s?.is_clocked_in && s?.time_entry) {
      const te = s.time_entry;
      setState({
        isClockedIn: true,
        clockInAt: te.clock_in,
        clockOutAt: te.clock_out,
        breakMinutesApplied: te.break_minutes_applied ?? te.break_minutes ?? null,
        status: te.status ?? null,
        source: te.source ?? null,
      });
    } else {
      setState({ isClockedIn: false });
    }
  }

  // initial
  useEffect(() => {
    loadStatus().catch((e: any) => setMsg({ type: "err", text: e?.message ?? "Status konnte nicht geladen werden" }));
  }, []);

  // timer
  useEffect(() => {
    if (!state.isClockedIn || !state.clockInAt) {
      setElapsedSec(0);
      return;
    }

    setElapsedSec(diffSecondsFrom(state.clockInAt));

    const id = setInterval(() => {
      setElapsedSec(diffSecondsFrom(state.clockInAt));
    }, 1000);

    return () => clearInterval(id);
  }, [state.isClockedIn, state.clockInAt]);

  const canClockIn = useMemo(() => !loading && !state.isClockedIn, [loading, state.isClockedIn]);
  const canClockOut = useMemo(() => !loading && state.isClockedIn, [loading, state.isClockedIn]);

  async function doClockIn() {
    setMsg(null);
    setLoading(true);
    try {
      await api.clockIn();
      await loadStatus();
      setMsg({ type: "ok", text: "✅ Eingestempelt" });
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Clock-in fehlgeschlagen" });
      await loadStatus().catch(() => {});
    } finally {
      setLoading(false);
    }
  }

  async function doClockOut() {
    setMsg(null);
    setLoading(true);
    try {
      await api.clockOut();
      await loadStatus();
      setMsg({ type: "ok", text: "✅ Ausgestempelt" });
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Clock-out fehlgeschlagen" });
      await loadStatus().catch(() => {});
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearToken();
    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="mx-auto max-w-3xl px-5 py-10">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Zeiterfassung</h1>
            <p className="mt-1 text-sm text-slate-500"> Workplan</p>
          </div>

          <button
            onClick={logout}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
          >
            Logout
          </button>
        </div>

        {/* Cards grid */}
        <div className="mt-7 grid gap-5 md:grid-cols-1">
          {/* Actions */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl/30">
            <h2 className="text-lg font-bold text-slate-900">Stempeln</h2>
            {/*<p className="mt-1 text-sm text-slate-500">Ein- und Ausstempeln</p>*/}
            <div className="mt-5 grid gap-3">
              <button
                onClick={doClockIn}
                disabled={!canClockIn}
                className="rounded-xl bg-green-700 px-4 py-3 font-semibold text-white shadow-md shadow-green-700/20 transition hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-200 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:shadow-none"
              >
                {loading ? "Bitte warten..." : "Einstempeln"}
              </button>

              <button
                onClick={doClockOut}
                disabled={!canClockOut}
                className="rounded-xl bg-green-700 px-4 py-3 font-semibold text-white shadow-md shadow-green-700/20 transition hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-200 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:shadow-none"
              >
                {loading ? "Bitte warten..." : "Ausstempeln"}
              </button>

            </div>

            {/* messages */}
            {/*{msg && (
              <div
                className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
                  msg.type === "ok"
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                {msg.text}
              </div>
            )}*/}

            {/* hint */}
            {/* <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
             Hier steht ein Text in einer Box
            </div>*/}

          </div>
          {/* Status */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl/30">
          {/* Wir nutzen grid-cols-3, damit die Mitte wirklich die Mitte ist */}
            <div className="grid grid-cols-3 items-center gap-4">
            
                {/* 1. Spalte: Status (Links) */}
                <h2 className="text-lg font-bold text-slate-900">Status </h2>
                {/*<p className="mt-1 text-sm text-slate-500">Live-Timer</p>*/}

                {/* 2. Spalte: Badge (Zentriert) */}
                <div className="flex justify-center">
                  {state.isClockedIn ? <Badge variant="green">EINGESTEMPELT</Badge> : <Badge variant="orange">NICHT EINGESTEMPELT</Badge>}
                </div>
                {/* 3. Spalte: Leer (Platzhalter für Symmetrie) */}
                <div />
            </div>

            {/* Timer */}
            <div className="mt-5 rounded-2xl bg-gradient-to-b from-slate-50 to-white p-5 ring-1 ring-slate-200">
              <div className="text-sm font-medium text-slate-600 flex items-center justify-center">Arbeitszeit</div>
              <div className="mt-2 font-mono text-4xl font-extrabold tracking-tight text-slate-900 flex items-center justify-center">
                {state.isClockedIn ? formatHHMMSS(elapsedSec) : "00:00:00"}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 flex items-center justify-center">
                {state.isClockedIn && state.breakMinutesApplied != null ? (
                  <Badge variant="slate">Pause: {state.breakMinutesApplied} min</Badge>
                ) : null}
              </div>
            </div>

            {/* times */}
            <div className="mt-5 grid gap-3 text-sm">
              <div className="flex items-center justify-center rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                <span className="text-slate-600">Eingestempelt um: <span className="font-semibold text-slate-900">{formatLocal(state.clockInAt)}</span></span>
              </div>
            </div>
          </div>    
                   {/* Footer */}
        <p className="mt-6 text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} Workplan by Oswald-IT
        </p>     
        </div>
      </div>
    </main>
  );
}