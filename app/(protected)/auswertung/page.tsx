"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import Badge from "@/components/ui/badge";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import SectionCard from "@/components/ui/section-card";
import AppButton from "@/components/ui/app-button";
import AlertBox from "@/components/ui/alert-box";
import FormField from "@/components/ui/form-field";
import SelectInput from "@/components/ui/select-input";

type UserOption = {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  email?: string | null;
  is_active?: boolean;
};

type MonthlyReport = {
  user_id?: number;
  user_name?: string | null;
  year: number;
  month: number;
  total_work_minutes: number;
  total_break_minutes: number;
  total_entries: number;
  entries?: ReportEntry[];
};

type ReportEntry = {
  date: string;
  clock_in: string;
  clock_out?: string | null;
  break_minutes?: number;
  net_minutes?: number;
  shift_type_name?: string | null;
  shift_type_color?: string | null;
  counts_as_work?: boolean;
};

const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

function displayUser(u: UserOption) {
  const full = `${u.first_name?.trim() ?? ""} ${u.last_name?.trim() ?? ""}`.trim();
  return full || u.name?.trim() || u.email || `User ${u.id}`;
}

function formatHM(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function formatLocal(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(dateIso?: string | null) {
  if (!dateIso) return "—";
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return dateIso;
  return d.toLocaleDateString("de-CH", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function currentYear() { return new Date().getFullYear(); }
function currentMonth() { return new Date().getMonth() + 1; }

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl/30">
      <div className="text-sm font-semibold text-slate-600">{label}</div>
      <div className="mt-2 text-2xl font-extrabold text-slate-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export default function AuswertungPage() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [year, setYear] = useState(currentYear());
  const [month, setMonth] = useState(currentMonth());
  const [report, setReport] = useState<MonthlyReport | MonthlyReport[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const me = await api.me();
        if (me?.role === "admin") {
          setIsAdmin(true);
          const data = await api.users();
          setUsers(Array.isArray(data) ? data.filter((u: UserOption) => u.is_active !== false) : []);
        }
      } catch {}
    }
    init();
  }, []);

  async function loadReport() {
    setLoading(true);
    setMsg(null);
    setReport(null);
    try {
      if (isAdmin && selectedUserId !== "all") {
        const data = await api.reportsUserMonthly(Number(selectedUserId), year, month);
        setReport(data);
      } else {
        const data = await api.reportsMonthly(year, month);
        setReport(data);
      }
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Auswertung konnte nicht geladen werden" });
    } finally {
      setLoading(false);
    }
  }

  const years = useMemo(() => {
    const y = currentYear();
    return [y - 2, y - 1, y, y + 1];
  }, []);

  // Normalisiere Report zu Array für Übersicht
  const reportList: MonthlyReport[] = useMemo(() => {
    if (!report) return [];
    if (Array.isArray(report)) return report;
    return [report];
  }, [report]);

  const totals = useMemo(() => {
    const workMin = reportList.reduce((s, r) => s + (r.total_work_minutes ?? 0), 0);
    const breakMin = reportList.reduce((s, r) => s + (r.total_break_minutes ?? 0), 0);
    const entries = reportList.reduce((s, r) => s + (r.total_entries ?? 0), 0);
    return { workMin, breakMin, entries };
  }, [reportList]);

  return (
    <PageContainer>
      <div className="grid gap-6">
        <PageHeader
          title="Monatsauswertung"
          subtitle="Arbeitszeiten nach Monat und Mitarbeiter auswerten."
        />

        {/* Filter */}
        <SectionCard title="Zeitraum wählen">
          <div className="grid gap-4 md:grid-cols-4">
            <FormField label="Jahr" htmlFor="year">
              <SelectInput
                id="year"
                title="Jahr"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </SelectInput>
            </FormField>

            <FormField label="Monat" htmlFor="month">
              <SelectInput
                id="month"
                title="Monat"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </SelectInput>
            </FormField>

            {isAdmin && (
              <FormField label="Mitarbeiter" htmlFor="user">
                <SelectInput
                  id="user"
                  title="Mitarbeiter"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="all">Alle Mitarbeiter</option>
                  {users
                    .sort((a, b) => displayUser(a).localeCompare(displayUser(b)))
                    .map((u) => (
                      <option key={u.id} value={u.id}>{displayUser(u)}</option>
                    ))}
                </SelectInput>
              </FormField>
            )}

            <div className="flex items-end">
              <AppButton type="button" onClick={loadReport} disabled={loading} className="w-full">
                {loading ? "Lädt..." : "Auswertung laden"}
              </AppButton>
            </div>
          </div>
        </SectionCard>

        {msg && <AlertBox variant={msg.type}>{msg.text}</AlertBox>}

        {/* Zusammenfassung */}
        {reportList.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Gesamte Arbeitszeit"
                value={formatHM(totals.workMin)}
                sub={`${MONTHS[month - 1]} ${year}`}
              />
              <StatCard
                label="Gesamte Pausenzeit"
                value={formatHM(totals.breakMin)}
                sub="Abgezogene Pausen"
              />
              <StatCard
                label="Einträge"
                value={String(totals.entries)}
                sub="Stempeleinträge gesamt"
              />
            </div>

            {/* Pro Mitarbeiter */}
            {reportList.map((r, idx) => (
              <SectionCard
                key={idx}
                title={r.user_name ?? `${MONTHS[month - 1]} ${year}`}
                right={
                  <div className="flex items-center gap-2">
                    <Badge variant="green">{formatHM(r.total_work_minutes)}</Badge>
                    <Badge variant="slate">{r.total_entries} Einträge</Badge>
                  </div>
                }
              >
                {/* Zusammenfassung Zeile */}
                <div className="mb-4 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm ring-1 ring-slate-200">
                  <div>
                    <div className="text-slate-500">Arbeitszeit</div>
                    <div className="font-semibold text-slate-900">{formatHM(r.total_work_minutes)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Pausen</div>
                    <div className="font-semibold text-slate-900">{formatHM(r.total_break_minutes)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Einträge</div>
                    <div className="font-semibold text-slate-900">{r.total_entries}</div>
                  </div>
                </div>

                {/* Detail-Tabelle Desktop */}
                {r.entries && r.entries.length > 0 && (
                  <>
                    <div className="hidden overflow-hidden rounded-xl ring-1 ring-slate-200 md:block">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Datum</th>
                            <th className="px-4 py-3 font-semibold">Einstempel</th>
                            <th className="px-4 py-3 font-semibold">Ausstempel</th>
                            <th className="px-4 py-3 font-semibold">Schicht</th>
                            <th className="px-4 py-3 font-semibold">Pause</th>
                            <th className="px-4 py-3 font-semibold">Netto</th>
                            <th className="px-4 py-3 font-semibold">Wertung</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {r.entries.map((e, i) => (
                            <tr key={i} className="hover:bg-slate-50/60">
                              <td className="px-4 py-3 font-semibold text-slate-900">
                                {formatDateLabel(e.date)}
                              </td>
                              <td className="px-4 py-3 text-slate-700">{formatLocal(e.clock_in)}</td>
                              <td className="px-4 py-3 text-slate-700">{formatLocal(e.clock_out)}</td>
                              <td className="px-4 py-3">
                                {e.shift_type_name ? (
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="h-3 w-3 rounded-full ring-1 ring-slate-200"
                                      style={{ backgroundColor: e.shift_type_color || "#2563eb" }}
                                    />
                                    <span className="text-slate-700">{e.shift_type_name}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {e.break_minutes ? `${e.break_minutes} min` : "—"}
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-900">
                                {e.net_minutes != null ? formatHM(e.net_minutes) : "—"}
                              </td>
                              <td className="px-4 py-3">
                                {e.counts_as_work === false ? (
                                  <Badge variant="orange">Nicht anrechenbar</Badge>
                                ) : (
                                  <Badge variant="green">Anrechenbar</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="grid gap-3 md:hidden">
                      {r.entries.map((e, i) => (
                        <div key={i} className="rounded-2xl border border-slate-200 p-4 shadow-sm">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold text-slate-900">{formatDateLabel(e.date)}</div>
                            {e.counts_as_work === false ? (
                              <Badge variant="orange">Nicht anrechenbar</Badge>
                            ) : (
                              <Badge variant="green">Anrechenbar</Badge>
                            )}
                          </div>
                          <div className="mt-2 text-sm text-slate-600">
                            <div>Ein: {formatLocal(e.clock_in)} · Aus: {formatLocal(e.clock_out)}</div>
                            {e.shift_type_name && <div className="mt-1">Schicht: {e.shift_type_name}</div>}
                            <div className="mt-1">
                              Pause: {e.break_minutes ? `${e.break_minutes} min` : "—"} ·
                              Netto: {e.net_minutes != null ? formatHM(e.net_minutes) : "—"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {r.entries && r.entries.length === 0 && (
                  <AlertBox variant="info">Keine Einträge für diesen Monat.</AlertBox>
                )}
              </SectionCard>
            ))}
          </>
        )}

        {!loading && !msg && reportList.length === 0 && (
          <AlertBox variant="info">
            Zeitraum wählen und auf "Auswertung laden" klicken.
          </AlertBox>
        )}

        <p className="text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} Workplan by Oswald-IT
        </p>
      </div>
    </PageContainer>
  );
}
