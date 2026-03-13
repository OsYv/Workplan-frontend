"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import SectionCard from "@/components/ui/section-card";
import AppButton from "@/components/ui/app-button";
import AlertBox from "@/components/ui/alert-box";

type TimeEntry = {
  id: number;
  shift_id: number | null;
  clock_in: string;
  clock_out: string | null;
  break_minutes_applied?: number | null;
  status?: string | null;
  source?: string | null;
};

type Shift = {
  id: number;
  user_id: number;
  user_name?: string | null;
  shift_type_id: number;
  shift_type_name?: string | null;
  shift_type_color?: string | null;
  shift_type_counts_as_work?: boolean | null;
  date: string;
  start_time: string;
  end_time: string;
  is_flexible: boolean;
  notes?: string | null;
};

function formatLocal(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("de-CH");
}

function minutesBetween(aIso?: string | null, bIso?: string | null) {
  if (!aIso || !bIso) return 0;
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  const diffMs = Math.max(0, b - a);
  return Math.floor(diffMs / 60000);
}

function formatHM(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function isoDateFromDateTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(dateIso: string) {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return dateIso;
  return d.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function subDaysIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function Badge({
  children,
  variant = "slate",
}: {
  children: React.ReactNode;
  variant?: "slate" | "green" | "red" | "orange";
}) {
  const cls =
    variant === "green"
      ? "bg-green-100 text-green-800 ring-green-200"
      : variant === "red"
      ? "bg-red-100 text-red-800 ring-red-200"
      : variant === "orange"
      ? "bg-orange-100 text-orange-800 ring-orange-200"
      : "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${cls}`}>
      {children}
    </span>
  );
}

export default function ArbeitszeitkontrollePage() {
  const [items, setItems] = useState<TimeEntry[]>([]);
  const [myShifts, setMyShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [limit, setLimit] = useState(25);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const historyData: any = await api.history(limit);
      const historyList = Array.isArray(historyData)
        ? historyData
        : historyData?.items ?? [];

      setItems(historyList);

      const oldestEntry = historyList[historyList.length - 1];
      const fromDate = oldestEntry?.clock_in
        ? isoDateFromDateTime(oldestEntry.clock_in)
        : subDaysIso(60);

      const toDate = todayIso();

      const shiftsData: any = await api.myShifts(fromDate, toDate);
      const shiftList = Array.isArray(shiftsData) ? shiftsData : [];
      setMyShifts(shiftList);
    } catch (e: any) {
      setErr(e?.message ?? "Konnte Arbeitszeitkontrolle nicht laden");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [limit]);

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, Shift[]>();

    for (const shift of myShifts) {
      const existing = map.get(shift.date) ?? [];
      existing.push(shift);
      map.set(shift.date, existing);
    }

    return map;
  }, [myShifts]);

  const entriesWithMeta = useMemo(() => {
    return items.map((it) => {
      const day = isoDateFromDateTime(it.clock_in);
      const shiftsForDay = shiftsByDate.get(day) ?? [];

      const hasAnyShift = shiftsForDay.length > 0;
      const countsAsWork =
        !hasAnyShift ||
        shiftsForDay.some((s) => s.shift_type_counts_as_work !== false);

      const firstShift = shiftsForDay[0] ?? null;

      const rawMin = it.clock_out ? minutesBetween(it.clock_in, it.clock_out) : 0;
      const br = Number(it.break_minutes_applied ?? 0) || 0;
      const netMin = it.clock_out ? Math.max(0, rawMin - br) : 0;

      return {
        ...it,
        date: day,
        breakMin: br,
        netMin,
        countsAsWork,
        shiftName: firstShift?.shift_type_name ?? null,
        shiftColor: firstShift?.shift_type_color ?? null,
      };
    });
  }, [items, shiftsByDate]);

  const totals = useMemo(() => {
    let totalMin = 0;
    let totalBreak = 0;
    let excludedMin = 0;

    for (const it of entriesWithMeta) {
      if (!it.clock_out) continue;

      totalBreak += it.breakMin;

      if (it.countsAsWork) totalMin += it.netMin;
      else excludedMin += it.netMin;
    }

    return { totalMin, totalBreak, excludedMin };
  }, [entriesWithMeta]);

  return (
    <PageContainer>
      <div className="grid gap-6">
        <PageHeader
          title="Arbeitszeitkontrolle"
          subtitle="Übersicht deiner letzten Einträge. Nicht anrechenbare Schichten werden separat ausgewiesen."
          actions={
            <>
              <label htmlFor="limit" className="text-sm font-semibold text-slate-700">
                Anzahl
              </label>
              <select
                id="limit"
                title="Anzahl Einträge"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-200"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <AppButton type="button" variant="secondary" onClick={load} className="px-4 py-2 text-sm">
                Aktualisieren
              </AppButton>
            </>
          }
        />

        <div className="grid gap-4 sm:grid-cols-4">
          <SectionCard className="p-5">
            <div className="text-sm font-semibold text-slate-600">Einträge</div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900">{items.length}</div>
          </SectionCard>

          <SectionCard className="p-5">
            <div className="text-sm font-semibold text-slate-600">Gesamt (anrechenbar)</div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900">{formatHM(totals.totalMin)}</div>
          </SectionCard>

          <SectionCard className="p-5">
            <div className="text-sm font-semibold text-slate-600">Pausen</div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900">{formatHM(totals.totalBreak)}</div>
          </SectionCard>

          <SectionCard className="p-5">
            <div className="text-sm font-semibold text-slate-600">Nicht anrechenbar</div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900">{formatHM(totals.excludedMin)}</div>
          </SectionCard>
        </div>

        <SectionCard
          title="Historie"
          right={
            loading ? (
              <Badge>Lade…</Badge>
            ) : err ? (
              <Badge variant="red">Fehler</Badge>
            ) : (
              <Badge variant="green">OK</Badge>
            )
          }
        >
          {err && (
            <AlertBox variant="err" className="mb-5">
              {err}
            </AlertBox>
          )}

          <div className="hidden overflow-hidden rounded-xl ring-1 ring-slate-200 md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Datum</th>
                  <th className="px-4 py-3 font-semibold">Clock-in</th>
                  <th className="px-4 py-3 font-semibold">Clock-out</th>
                  <th className="px-4 py-3 font-semibold">Schicht</th>
                  <th className="px-4 py-3 font-semibold">Pause</th>
                  <th className="px-4 py-3 font-semibold">Dauer</th>
                  <th className="px-4 py-3 font-semibold">Wertung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entriesWithMeta.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-900">{formatDateLabel(it.date)}</td>
                    <td className="px-4 py-3 text-slate-900">{formatLocal(it.clock_in)}</td>
                    <td className="px-4 py-3 text-slate-900">{formatLocal(it.clock_out)}</td>
                    <td className="px-4 py-3">
                      {it.shiftName ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full ring-1 ring-slate-200"
                            style={{ backgroundColor: it.shiftColor || "rgb(37 99 235)" }}
                          />
                          <span className="text-slate-700">{it.shiftName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{it.breakMin ? `${it.breakMin} min` : "—"}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {it.clock_out ? formatHM(it.netMin) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {it.countsAsWork ? (
                        <Badge variant="green">Anrechenbar</Badge>
                      ) : (
                        <Badge variant="orange">Nicht anrechenbar</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {entriesWithMeta.map((it) => (
              <div key={it.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">{formatDateLabel(it.date)}</div>
                  {it.countsAsWork ? (
                    <Badge variant="green">Anrechenbar</Badge>
                  ) : (
                    <Badge variant="orange">Nicht anrechenbar</Badge>
                  )}
                </div>

                <div className="mt-3 text-sm text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-800">Clock-in:</span> {formatLocal(it.clock_in)}
                  </div>
                  <div className="mt-1">
                    <span className="font-semibold text-slate-800">Clock-out:</span> {formatLocal(it.clock_out)}
                  </div>
                  <div className="mt-1">
                    <span className="font-semibold text-slate-800">Schicht:</span> {it.shiftName ?? "—"}
                  </div>
                  <div className="mt-1">
                    <span className="font-semibold text-slate-800">Pause:</span> {it.breakMin ? `${it.breakMin} min` : "—"}
                  </div>
                  <div className="mt-1">
                    <span className="font-semibold text-slate-800">Dauer:</span> {it.clock_out ? formatHM(it.netMin) : "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!loading && !err && entriesWithMeta.length === 0 && (
            <AlertBox variant="info">
              Noch keine Einträge vorhanden.
            </AlertBox>
          )}
        </SectionCard>

        <p className="text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} Workplan by Oswald-IT
        </p>
      </div>
    </PageContainer>
  );
}