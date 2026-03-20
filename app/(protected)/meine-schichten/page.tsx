"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import Badge from "@/components/ui/badge";
import AppButton from "@/components/ui/app-button";
import AlertBox from "@/components/ui/alert-box";

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

type Absence = {
  id: number;
  user_id: number;
  user_name?: string | null;
  type: string;
  status: string;
  date_from: string;
  date_to: string;
  notes?: string | null;
};

type UserOption = {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  email?: string | null;
  is_active?: boolean;
};

const DEFAULT_COLOR = "#2563eb";

const ABSENCE_TYPES: Record<string, { label: string; color: string }> = {
  urlaub:        { label: "Urlaub",             color: "#1D9E75" },
  krankheit:     { label: "Krankheit",          color: "#E24B4A" },
  feiertag:      { label: "Feiertag",           color: "#378ADD" },
  weiterbildung: { label: "Weiterbildung",      color: "#7F77DD" },
  unbezahlt:     { label: "Unbezahlter Urlaub", color: "#888780" },
  schule:        { label: "Schule",             color: "#BA7517" },
};

const MONTHS = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];

function todayIso() { return new Date().toISOString().slice(0, 10); }

function startOfWeekIso() {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

function addDays(dateIso: string, days: number) {
  const d = new Date(dateIso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function endOfMonthIso(year: number, month: number) {
  return new Date(year, month, 0).toISOString().slice(0, 10);
}

function formatDayShort(dateIso: string) {
  const d = new Date(dateIso);
  return d.toLocaleDateString("de-CH", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function displayUser(u: UserOption) {
  const full = `${u.first_name?.trim() ?? ""} ${u.last_name?.trim() ?? ""}`.trim();
  return full || u.name?.trim() || u.email || `User ${u.id}`;
}

function getInitials(label?: string | null) {
  if (!label) return "U";
  const base = label.includes("@") ? label.split("@")[0] : label;
  const parts = base.split(/[._\-\s]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function userAvatarColor(seed: string) {
  const colors = ["bg-blue-100 text-blue-700","bg-fuchsia-100 text-fuchsia-700","bg-emerald-100 text-emerald-700","bg-orange-100 text-orange-700","bg-violet-100 text-violet-700","bg-cyan-100 text-cyan-700","bg-amber-100 text-amber-700","bg-lime-100 text-lime-700"];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function CellContent({ shifts, absences }: { shifts: Shift[]; absences: Absence[] }) {
  if (shifts.length === 0 && absences.length === 0) {
    return <span style={{ color: "#cbd5e1", fontSize: 11 }}>–</span>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {absences.map((a) => {
        const info = ABSENCE_TYPES[a.type] ?? { label: a.type, color: "#888780" };
        return (
          <div key={`a${a.id}`} style={{ borderLeft: `3px solid ${info.color}`, backgroundColor: `${info.color}22`, borderRadius: 4, padding: "2px 5px", fontSize: 11, fontWeight: 600, color: "#0f172a" }}>
            {info.label}{a.status === "beantragt" ? " (?)" : ""}
          </div>
        );
      })}
      {shifts.map((s) => (
        <div key={s.id} style={{ borderLeft: `3px solid ${s.shift_type_color || DEFAULT_COLOR}`, backgroundColor: `${s.shift_type_color || DEFAULT_COLOR}18`, borderRadius: 4, padding: "2px 5px", fontSize: 11, color: "#0f172a" }}>
          <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.shift_type_name || "Schicht"}</div>
          <div style={{ opacity: 0.7 }}>{s.start_time}–{s.end_time}</div>
        </div>
      ))}
    </div>
  );
}

export default function MeineSchichtenPage() {
  const [tab, setTab] = useState<"meine" | "alle">("meine");
  const [view, setView] = useState<"woche" | "monat">("woche");
  const [isAdmin, setIsAdmin] = useState(false);
  const [myUserId, setMyUserId] = useState<number | null>(null);

  const [weekStart, setWeekStart] = useState(startOfWeekIso());
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const [myShifts, setMyShifts] = useState<Shift[]>([]);
  const [allShifts, setAllShifts] = useState<Shift[]>([]);
  const [myAbsences, setMyAbsences] = useState<Absence[]>([]);
  const [allAbsences, setAllAbsences] = useState<Absence[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd = weekDays[6];

  const monthDays = useMemo(() => {
    const count = new Date(year, month, 0).getDate();
    return Array.from({ length: count }, (_, i) => `${year}-${String(month).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`);
  }, [year, month]);

  const displayDays = view === "woche" ? weekDays : monthDays;
  const from = view === "woche" ? weekStart : `${year}-${String(month).padStart(2,"0")}-01`;
  const to = view === "woche" ? weekEnd : endOfMonthIso(year, month);

  const periodLabel = view === "woche"
    ? `${formatDayShort(weekStart)} – ${formatDayShort(weekEnd)}`
    : `${MONTHS[month - 1]} ${year}`;

  useEffect(() => {
    api.me().then((me) => { setMyUserId(me.id); setIsAdmin(me?.role === "admin"); }).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [from, to, tab, isAdmin]);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      if (tab === "meine") {
        const [s, a] = await Promise.all([api.myShifts(from, to), api.myAbsences()]);
        setMyShifts(Array.isArray(s) ? s : []);
        setMyAbsences(Array.isArray(a) ? a : []);
      } else {
        const promises: Promise<any>[] = [api.shifts(from, to), api.allAbsences({ from, to })];
        if (users.length === 0) promises.push(api.users());
        const [s, a, u] = await Promise.all(promises);
        setAllShifts(Array.isArray(s) ? s : []);
        setAllAbsences(Array.isArray(a) ? a : []);
        if (u) setUsers(Array.isArray(u) ? u.filter((x: UserOption) => x.is_active !== false) : []);
      }
    } catch (e: any) {
      setMsg(e?.message ?? "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }

  function prevPeriod() {
    if (view === "woche") setWeekStart(addDays(weekStart, -7));
    else { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }
  }
  function nextPeriod() {
    if (view === "woche") setWeekStart(addDays(weekStart, 7));
    else { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }
  }
  function goToday() {
    if (view === "woche") setWeekStart(startOfWeekIso());
    else { setYear(new Date().getFullYear()); setMonth(new Date().getMonth() + 1); }
  }

  const groupedUsers = useMemo(() => {
    // Reihenfolge aus sort_order Feld der API (bereits serverseitig gesetzt)
    return [...users]
      .map((u) => ({ id: u.id, name: displayUser(u), sort_order: (u as any).sort_order ?? 0 }))
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  }, [users]);

  const COL_NAME = 160;
  const COL_DAY = 120;
  const tableWidth = (tab === "meine" ? 0 : COL_NAME) + displayDays.length * COL_DAY;

  return (
    <div style={{ padding: "2.5rem 1.25rem" }}>
      <div style={{ maxWidth: "72rem", margin: "0 auto 1.5rem" }}>
        {/* Header */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>Schichten</h1>
            <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>Übersicht der geplanten Einsätze.</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <button onClick={() => setView("woche")} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: view === "woche" ? "#15803d" : "#fff", color: view === "woche" ? "#fff" : "#475569", border: "none", cursor: "pointer" }}>Woche</button>
              <button onClick={() => setView("monat")} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: view === "monat" ? "#15803d" : "#fff", color: view === "monat" ? "#fff" : "#475569", border: "none", borderLeft: "1px solid #e2e8f0", cursor: "pointer" }}>Monat</button>
            </div>
            <button onClick={prevPeriod} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 14 }}>←</button>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", minWidth: 130, textAlign: "center" }}>{periodLabel}</span>
            <button onClick={nextPeriod} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 14 }}>→</button>
            <button onClick={goToday} style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: "#15803d", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Heute</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 4, width: "fit-content", marginBottom: 20 }}>
          <button onClick={() => setTab("meine")} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", background: tab === "meine" ? "#fff" : "transparent", color: tab === "meine" ? "#0f172a" : "#64748b", cursor: "pointer", boxShadow: tab === "meine" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>Meine Schichten</button>
          {isAdmin && <button onClick={() => setTab("alle")} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", background: tab === "alle" ? "#fff" : "transparent", color: tab === "alle" ? "#0f172a" : "#64748b", cursor: "pointer", boxShadow: tab === "alle" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>Alle Mitarbeiter</button>}
        </div>

        {msg && <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontSize: 13 }}>{msg}</div>}
      </div>

      {/* Tabelle – volle Breite, scrollbar */}
      <div style={{ overflowX: "auto", borderRadius: 16, border: "1px solid #e2e8f0", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: tableWidth }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {tab === "alle" && <th style={{ width: COL_NAME, minWidth: COL_NAME, padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748b", borderBottom: "1px solid #e2e8f0", position: "sticky", left: 0, background: "#f8fafc", zIndex: 2 }}>Mitarbeiter</th>}
              {displayDays.map((day) => (
                <th key={day} style={{ width: COL_DAY, minWidth: COL_DAY, padding: "8px 4px", textAlign: "center", fontSize: 11, fontWeight: 700, color: day === todayIso() ? "#15803d" : "#475569", borderBottom: "1px solid #e2e8f0", borderLeft: "1px solid #e2e8f0", background: day === todayIso() ? "#f0fdf4" : "#f8fafc" }}>
                  {formatDayShort(day)}
                  {day === todayIso() && <div style={{ fontSize: 10, fontWeight: 400, color: "#16a34a" }}>Heute</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={displayDays.length + (tab === "alle" ? 1 : 0)} style={{ padding: 24, textAlign: "center", fontSize: 13, color: "#94a3b8" }}>Lade…</td></tr>
            ) : tab === "meine" ? (
              <tr>
                {displayDays.map((day) => {
                  const dayShifts = myShifts.filter((s) => s.date === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
                  const dayAbsences = myAbsences.filter((a) => a.status !== "abgelehnt" && a.date_from <= day && a.date_to >= day);
                  return (
                    <td key={day} style={{ verticalAlign: "top", padding: 6, borderLeft: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", minHeight: 80, background: day === todayIso() ? "#f0fdf4" : "#fff" }}>
                      <CellContent shifts={dayShifts} absences={dayAbsences} />
                    </td>
                  );
                })}
              </tr>
            ) : groupedUsers.length === 0 ? (
              <tr><td colSpan={displayDays.length + 1} style={{ padding: 24, textAlign: "center", fontSize: 13, color: "#94a3b8" }}>Keine Mitarbeiter gefunden.</td></tr>
            ) : (
              groupedUsers.map((u) => (
                <tr key={u.id} style={{ background: u.id === myUserId ? "#f0fdf4" : "#fff" }}>
                  <td style={{ width: COL_NAME, minWidth: COL_NAME, padding: "8px 12px", borderBottom: "1px solid #e2e8f0", position: "sticky", left: 0, background: u.id === myUserId ? "#f0fdf4" : "#fff", zIndex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className={`grid place-items-center rounded-full text-xs font-bold flex-shrink-0 ${userAvatarColor(u.name)}`} style={{ width: 32, height: 32, fontSize: 11 }}>{getInitials(u.name)}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", lineHeight: 1.3 }}>
                        {u.name}
                        {u.id === myUserId && <span style={{ fontSize: 11, color: "#16a34a", marginLeft: 4 }}>(ich)</span>}
                      </div>
                    </div>
                  </td>
                  {displayDays.map((day) => {
                    const dayShifts = allShifts.filter((s) => s.user_id === u.id && s.date === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
                    const dayAbsences = allAbsences.filter((a) => a.user_id === u.id && a.status !== "abgelehnt" && a.date_from <= day && a.date_to >= day);
                    return (
                      <td key={day} style={{ verticalAlign: "top", padding: 6, borderLeft: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", minWidth: COL_DAY, background: day === todayIso() ? (u.id === myUserId ? "#dcfce7" : "#f0fdf4") : (u.id === myUserId ? "#f0fdf4" : "#fff") }}>
                        <CellContent shifts={dayShifts} absences={dayAbsences} />
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p style={{ textAlign: "center", fontSize: 11, color: "#a1a1aa", marginTop: 24 }}>
        © {new Date().getFullYear()} Workplan by Oswald-IT
      </p>
    </div>
  );
}
