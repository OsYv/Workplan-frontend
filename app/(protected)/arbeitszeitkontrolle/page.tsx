"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import SectionCard from "@/components/ui/section-card";
import AlertBox from "@/components/ui/alert-box";
import SelectInput from "@/components/ui/select-input";
import Badge from "@/components/ui/badge";

type MonthSummary = {
  month: number;
  month_label: string;
  should_minutes: number;
  worked_minutes: number;
  diff_minutes: number;
  cumulative_minutes: number;
  vacation_days: number;
  vacation_minutes: number;
  sick_days: number;
  absence_days: number;
};

type YearlyReport = {
  user_id: number;
  user_name: string;
  year: number;
  weekly_hours: number;
  total_should_minutes: number;
  total_worked_minutes: number;
  total_diff_minutes: number;
  total_vacation_days: number;
  total_sick_days: number;
  months: MonthSummary[];
};

type UserOption = { id: number; name?: string | null; first_name?: string | null; last_name?: string | null; email: string; };

function hm(minutes: number, showSign = false): string {
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = showSign ? (minutes >= 0 ? "+" : "−") : "";
  return `${sign}${h}:${String(m).padStart(2, "0")}`;
}

function userName(u: UserOption) {
  const full = `${u.first_name?.trim() ?? ""} ${u.last_name?.trim() ?? ""}`.trim();
  return full || u.name?.trim() || u.email;
}

function DiffBadge({ minutes }: { minutes: number }) {
  if (minutes > 0) return <span style={{ color: "#15803d", fontWeight: 700 }}>{hm(minutes, true)}</span>;
  if (minutes < 0) return <span style={{ color: "#dc2626", fontWeight: 700 }}>{hm(minutes, true)}</span>;
  return <span style={{ color: "#64748b", fontWeight: 600 }}>0:00</span>;
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || "#0f172a", marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const TODAY_MONTH = new Date().getMonth() + 1;
const TODAY_YEAR = new Date().getFullYear();

export default function ArbeitszeitkontrollePage() {
  const [myId, setMyId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [year, setYear] = useState(TODAY_YEAR);
  const [report, setReport] = useState<YearlyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(TODAY_MONTH);

  useEffect(() => {
    api.me().then((me) => {
      setMyId(me.id);
      setIsAdmin(me.role === "admin");
      setSelectedUserId(me.id);
      if (me.role === "admin") {
        api.users().then((u) => setUsers(Array.isArray(u) ? u : [])).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    loadReport();
  }, [selectedUserId, year]);

  async function loadReport() {
    if (!selectedUserId) return;
    setLoading(true);
    setErr(null);
    try {
      const data = await api.yearlyReport(selectedUserId, year);
      setReport(data);
    } catch (e: any) {
      setErr(e?.message ?? "Bericht konnte nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }

  const currentMonth = report?.months.find(m => m.month === TODAY_MONTH && report.year === TODAY_YEAR);
  const lastCompletedMonth = report?.months.filter(m => m.month < TODAY_MONTH || report.year < TODAY_YEAR).slice(-1)[0];

  const years = Array.from({ length: 4 }, (_, i) => TODAY_YEAR - i);

  return (
    <PageContainer>
      <div className="grid gap-6">
        <PageHeader
          title="Arbeitszeitkontrolle"
          subtitle="Plus/Minus-Stunden, Urlaub und Arbeitszeit-Übersicht."
          actions={
            <div className="flex items-center gap-3">
              {isAdmin && users.length > 0 && (
                <select
                  value={selectedUserId ?? ""}
                  onChange={e => setSelectedUserId(Number(e.target.value))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-200"
                >
                  {users.map(u => <option key={u.id} value={u.id}>{userName(u)}</option>)}
                </select>
              )}
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-200"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          }
        />

        {err && <AlertBox variant="err">{err}</AlertBox>}

        {loading && (
          <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 14 }}>Lade Bericht…</div>
        )}

        {report && !loading && (
          <>
            {/* Kennzahlen */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
              <StatCard
                label="Plus/Minus gesamt"
                value={hm(report.total_diff_minutes, true)}
                sub={`Stand bis heute`}
                color={report.total_diff_minutes >= 0 ? "#15803d" : "#dc2626"}
              />
              <StatCard
                label="Soll (bisher)"
                value={hm(report.total_should_minutes)}
                sub={`${report.weekly_hours}h/Woche`}
              />
              <StatCard
                label="Ist (gearbeitet)"
                value={hm(report.total_worked_minutes)}
                sub="inkl. Urlaub & Krankheit"
              />
              <StatCard
                label="Urlaubstage"
                value={`${report.total_vacation_days}d`}
                sub="Bezogene Urlaubstage"
              />
              <StatCard
                label="Krankheitstage"
                value={`${report.total_sick_days}d`}
                sub={`Jahr ${report.year}`}
              />
            </div>

            {/* Monatsübersicht Tabelle */}
            <SectionCard title={`Monatsübersicht ${report.year}`} right={<Badge variant="slate">{report.user_name}</Badge>}>
              <div className="overflow-x-auto">
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Monat</th>
                      <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#475569" }}>Soll</th>
                      <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#475569" }}>Ist</th>
                      <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#475569" }}>+/−</th>
                      <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#475569" }}>Kumuliert</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#475569" }}>Urlaub</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#475569" }}>Krank</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.months.map((m) => {
                      const isFuture = m.month > TODAY_MONTH && report.year === TODAY_YEAR;
                      const isCurrent = m.month === TODAY_MONTH && report.year === TODAY_YEAR;
                      return (
                        <tr
                          key={m.month}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            background: isCurrent ? "#f0fdf4" : isFuture ? "#fafafa" : "#fff",
                            opacity: isFuture ? 0.5 : 1,
                          }}
                        >
                          <td style={{ padding: "10px 12px", fontWeight: isCurrent ? 700 : 500, color: "#0f172a" }}>
                            {m.month_label}
                            {isCurrent && <span style={{ marginLeft: 6, fontSize: 10, background: "#dcfce7", color: "#15803d", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>Aktuell</span>}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#64748b" }}>{hm(m.should_minutes)}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#0f172a" }}>{isFuture ? "–" : hm(m.worked_minutes)}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right" }}>
                            {isFuture ? <span style={{ color: "#94a3b8" }}>–</span> : <DiffBadge minutes={m.diff_minutes} />}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right" }}>
                            {isFuture ? <span style={{ color: "#94a3b8" }}>–</span> : <DiffBadge minutes={m.cumulative_minutes} />}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center", color: m.vacation_days > 0 ? "#1d9e75" : "#94a3b8" }}>
                            {m.vacation_days > 0 ? `${m.vacation_days}d` : "–"}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center", color: m.sick_days > 0 ? "#e24b4a" : "#94a3b8" }}>
                            {m.sick_days > 0 ? `${m.sick_days}d` : "–"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: "2px solid #e2e8f0", background: "#f8fafc" }}>
                      <td style={{ padding: "12px", fontWeight: 700, color: "#0f172a" }}>Total</td>
                      <td style={{ padding: "12px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>{hm(report.total_should_minutes)}</td>
                      <td style={{ padding: "12px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>{hm(report.total_worked_minutes)}</td>
                      <td style={{ padding: "12px", textAlign: "right", fontWeight: 700 }}><DiffBadge minutes={report.total_diff_minutes} /></td>
                      <td style={{ padding: "12px", textAlign: "right", fontWeight: 700 }}><DiffBadge minutes={report.total_diff_minutes} /></td>
                      <td style={{ padding: "12px", textAlign: "center", fontWeight: 700, color: "#1d9e75" }}>{report.total_vacation_days > 0 ? `${report.total_vacation_days}d` : "–"}</td>
                      <td style={{ padding: "12px", textAlign: "center", fontWeight: 700, color: "#e24b4a" }}>{report.total_sick_days > 0 ? `${report.total_sick_days}d` : "–"}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </SectionCard>

            {/* Legende */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "#64748b" }}>
              <div><span style={{ fontWeight: 600, color: "#0f172a" }}>Soll:</span> Arbeitstage × {(report.weekly_hours / 5).toFixed(1)}h/Tag</div>
              <div><span style={{ fontWeight: 600, color: "#0f172a" }}>Ist:</span> Gestempelte Zeit + Urlaub + Krankheit</div>
              <div><span style={{ color: "#15803d", fontWeight: 600 }}>+</span> = Überstunden</div>
              <div><span style={{ color: "#dc2626", fontWeight: 600 }}>−</span> = Minusstunden</div>
            </div>
          </>
        )}

        <p className="text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} Workplan by Oswald-IT
        </p>
      </div>
    </PageContainer>
  );
}
