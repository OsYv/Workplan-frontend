"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type Shift = {
  id: number;
  user_id: number;
  shift_type_id: number;
  shift_type_name?: string | null;
  shift_type_color?: string | null;
  date: string;
  start_time: string;
  end_time: string;
  is_flexible: boolean;
  notes?: string | null;
};

type Absence = {
  id: number;
  user_id: number;
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
  urlaub:        { label: "Urlaub",        color: "#1D9E75" },
  krankheit:     { label: "Krankheit",     color: "#E24B4A" },
  feiertag:      { label: "Feiertag",      color: "#378ADD" },
  weiterbildung: { label: "Weiterbildung", color: "#7F77DD" },
  unbezahlt:     { label: "Unbezahlt",     color: "#888780" },
  schule:        { label: "Schule",        color: "#BA7517" },
};

const MONTHS = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const WEEKDAYS = ["Mo","Di","Mi","Do","Fr","Sa","So"];

const COL_NAME = 160;
const COL_DAY = 120;

function todayIso() { return new Date().toISOString().slice(0, 10); }
function isWeekend(d: string) { const day = new Date(d).getDay(); return day === 0 || day === 6; }

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

function formatDayShort(dateIso: string) {
  return new Date(dateIso).toLocaleDateString("de-CH", { weekday: "short", day: "2-digit", month: "2-digit" });
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

// Kalender-Wochen für Monatsansicht berechnen
function getCalendarWeeks(year: number, month: number): (string | null)[][] {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  // Mo=0 .. So=6
  const startDow = (firstDay.getDay() + 6) % 7;
  const weeks: (string | null)[][] = [];
  let week: (string | null)[] = Array(startDow).fill(null);

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const iso = `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    week.push(iso);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

function ShiftPill({ s }: { s: Shift }) {
  return (
    <div style={{ borderLeft: `3px solid ${s.shift_type_color || DEFAULT_COLOR}`, backgroundColor: `${s.shift_type_color || DEFAULT_COLOR}20`, borderRadius: 4, padding: "2px 5px", fontSize: 11, color: "#0f172a", marginBottom: 2 }}>
      <div style={{ fontWeight: 700 }}>{s.shift_type_name || "Schicht"}</div>
      <div style={{ opacity: 0.7 }}>{s.start_time}–{s.end_time}</div>
    </div>
  );
}

function AbsencePill({ a }: { a: Absence }) {
  const info = ABSENCE_TYPES[a.type] ?? { label: a.type, color: "#888780" };
  return (
    <div style={{ borderLeft: `3px solid ${info.color}`, backgroundColor: `${info.color}22`, borderRadius: 4, padding: "2px 5px", fontSize: 11, fontWeight: 600, color: "#0f172a", marginBottom: 2 }}>
      {info.label}{a.status === "beantragt" ? " (?)" : ""}
    </div>
  );
}

function TableCellContent({ shifts, absences }: { shifts: Shift[]; absences: Absence[] }) {
  if (shifts.length === 0 && absences.length === 0) return <span style={{ color: "#cbd5e1", fontSize: 11 }}>–</span>;
  return (
    <div>
      {absences.map(a => <AbsencePill key={`a${a.id}`} a={a} />)}
      {shifts.map(s => <ShiftPill key={s.id} s={s} />)}
    </div>
  );
}

export default function MeineSchichtenPage() {
  const [tab, setTab] = useState<"meine" | "alle">("meine");
  const [view, setView] = useState<"woche" | "monat">("woche");
  const [myUserId, setMyUserId] = useState<number | null>(null);

  const [weekStart, setWeekStart] = useState(startOfWeekIso());
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const [myShifts, setMyShifts] = useState<Shift[]>([]);
  const [allShifts, setAllShifts] = useState<Shift[]>([]);
  const [myAbsences, setMyAbsences] = useState<Absence[]>([]);
  const [allAbsences, setAllAbsences] = useState<Absence[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [dayNotes, setDayNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd = weekDays[6];

  const monthDays = useMemo(() => {
    const count = new Date(year, month, 0).getDate();
    return Array.from({ length: count }, (_, i) => `${year}-${String(month).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`);
  }, [year, month]);

  const calendarWeeks = useMemo(() => getCalendarWeeks(year, month), [year, month]);

  const from = view === "woche" ? weekStart : `${year}-${String(month).padStart(2,"0")}-01`;
  const to = view === "woche" ? weekEnd : new Date(year, month, 0).toISOString().slice(0, 10);

  const periodLabel = view === "woche"
    ? `${formatDayShort(weekStart)} – ${formatDayShort(weekEnd)}`
    : `${MONTHS[month - 1]} ${year}`;

  // Wochenansicht: Wochenenden ausblenden wenn leer
  const visibleWeekDays = useMemo(() => {
    if (view !== "woche") return weekDays;
    return weekDays.filter(day => {
      if (!isWeekend(day)) return true;
      const shifts = tab === "meine" ? myShifts : allShifts;
      const absences = tab === "meine" ? myAbsences : allAbsences;
      return shifts.some(s => s.date === day) || absences.some(a => a.status !== "abgelehnt" && a.date_from <= day && a.date_to >= day);
    });
  }, [weekDays, view, tab, myShifts, allShifts, myAbsences, allAbsences]);

  const tableWidth = (tab === "alle" ? COL_NAME : 0) + visibleWeekDays.length * COL_DAY;

  useEffect(() => {
    api.me().then(me => setMyUserId(me.id)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [from, to, tab]);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const notesP = api.getDayNotes(from, to);
      if (tab === "meine") {
        const [s, a, n] = await Promise.all([api.myShifts(from, to), api.myAbsences(), notesP]);
        setMyShifts(Array.isArray(s) ? s : []);
        setMyAbsences(Array.isArray(a) ? a : []);
        const nm: Record<string,string> = {};
        if (Array.isArray(n)) n.forEach((x: any) => { nm[x.date] = x.note; });
        setDayNotes(nm);
      } else {
        const extras: Promise<any>[] = [api.shifts(from, to), api.allAbsences({ from, to }), notesP];
        if (users.length === 0) extras.push(api.users());
        const [s, a, n, u] = await Promise.all(extras);
        setAllShifts(Array.isArray(s) ? s : []);
        setAllAbsences(Array.isArray(a) ? a : []);
        const nm: Record<string,string> = {};
        if (Array.isArray(n)) n.forEach((x: any) => { nm[x.date] = x.note; });
        setDayNotes(nm);
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

  const groupedUsers = useMemo(() =>
    [...users].map(u => ({ id: u.id, name: displayUser(u), sort_order: (u as any).sort_order ?? 0 }))
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [users]
  );

  const today = todayIso();

  return (
    <div style={{ padding: "2.5rem 1.25rem" }}>
      {/* Header */}
      <div style={{ maxWidth: "72rem", margin: "0 auto" }}>
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
          <button onClick={() => setTab("alle")} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", background: tab === "alle" ? "#fff" : "transparent", color: tab === "alle" ? "#0f172a" : "#64748b", cursor: "pointer", boxShadow: tab === "alle" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>Alle Mitarbeiter</button>
        </div>

        {msg && <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontSize: 13 }}>{msg}</div>}
      </div>

      {/* ── WOCHENANSICHT (Tabelle wie Dienstplan) ── */}
      {view === "woche" && (
        <div style={{ overflowX: "auto", borderRadius: 16, border: "1px solid #e2e8f0", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <table style={{ borderCollapse: "collapse", width: `${tableWidth}px`, minWidth: "100%" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {tab === "alle" && (
                  <th style={{ width: COL_NAME, minWidth: COL_NAME, padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748b", borderBottom: "1px solid #e2e8f0", position: "sticky", left: 0, background: "#f8fafc", zIndex: 2 }}>Mitarbeiter</th>
                )}
                {visibleWeekDays.map(day => (
                  <th key={day} style={{ width: COL_DAY, minWidth: COL_DAY, padding: "6px 4px", textAlign: "center", fontSize: 11, fontWeight: 700, color: day === today ? "#15803d" : "#475569", borderBottom: "1px solid #e2e8f0", borderLeft: "1px solid #e2e8f0", background: day === today ? "#f0fdf4" : "#f8fafc", verticalAlign: "top" }}>
                    {formatDayShort(day)}
                    {day === today && <div style={{ fontSize: 10, fontWeight: 400, color: "#16a34a" }}>Heute</div>}
                    {dayNotes[day] && <div style={{ marginTop: 3, fontSize: 10, fontWeight: 500, color: "#15803d", background: "#dcfce7", borderRadius: 4, padding: "1px 4px" }}>{dayNotes[day]}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={visibleWeekDays.length + (tab === "alle" ? 1 : 0)} style={{ padding: 24, textAlign: "center", fontSize: 13, color: "#94a3b8" }}>Lade…</td></tr>
              ) : tab === "meine" ? (
                <tr>
                  {visibleWeekDays.map(day => {
                    const dayShifts = myShifts.filter(s => s.date === day).sort((a,b) => a.start_time.localeCompare(b.start_time));
                    const dayAbsences = myAbsences.filter(a => a.status !== "abgelehnt" && a.date_from <= day && a.date_to >= day);
                    return (
                      <td key={day} style={{ verticalAlign: "top", padding: 6, borderLeft: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", background: day === today ? "#f0fdf4" : "#fff", minHeight: 80 }}>
                        <TableCellContent shifts={dayShifts} absences={dayAbsences} />
                      </td>
                    );
                  })}
                </tr>
              ) : groupedUsers.length === 0 ? (
                <tr><td colSpan={visibleWeekDays.length + 1} style={{ padding: 24, textAlign: "center", fontSize: 13, color: "#94a3b8" }}>Keine Mitarbeiter gefunden.</td></tr>
              ) : (
                groupedUsers.map(u => (
                  <tr key={u.id} style={{ background: u.id === myUserId ? "#f0fdf4" : "#fff" }}>
                    <td style={{ width: COL_NAME, minWidth: COL_NAME, padding: "8px 12px", borderBottom: "1px solid #e2e8f0", position: "sticky", left: 0, background: u.id === myUserId ? "#f0fdf4" : "#fff", zIndex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className={`grid place-items-center rounded-full text-xs font-bold flex-shrink-0 ${userAvatarColor(u.name)}`} style={{ width: 30, height: 30, fontSize: 11 }}>{getInitials(u.name)}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", lineHeight: 1.3 }}>
                          {u.name}
                          {u.id === myUserId && <div style={{ fontSize: 10, color: "#16a34a" }}>(ich)</div>}
                        </div>
                      </div>
                    </td>
                    {visibleWeekDays.map(day => {
                      const dayShifts = allShifts.filter(s => s.user_id === u.id && s.date === day).sort((a,b) => a.start_time.localeCompare(b.start_time));
                      const dayAbsences = allAbsences.filter(a => a.user_id === u.id && a.status !== "abgelehnt" && a.date_from <= day && a.date_to >= day);
                      return (
                        <td key={day} style={{ verticalAlign: "top", padding: 6, borderLeft: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", minWidth: COL_DAY, background: day === today ? (u.id === myUserId ? "#dcfce7" : "#f0fdf4") : (u.id === myUserId ? "#f0fdf4" : "#fff") }}>
                          <TableCellContent shifts={dayShifts} absences={dayAbsences} />
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MONATSANSICHT MEINE (klassischer Kalender) ── */}
      {view === "monat" && tab === "meine" && (
        <div style={{ borderRadius: 16, border: "1px solid #e2e8f0", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          {/* Wochentag-Header */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
            {WEEKDAYS.map(wd => (
              <div key={wd} style={{ padding: "10px 8px", textAlign: "center", fontSize: 12, fontWeight: 700, color: wd === "Sa" || wd === "So" ? "#94a3b8" : "#64748b" }}>{wd}</div>
            ))}
          </div>

          {/* Kalenderwochen */}
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "#94a3b8" }}>Lade…</div>
          ) : (
            calendarWeeks.map((week, wi) => (
              <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: wi < calendarWeeks.length - 1 ? "1px solid #e2e8f0" : "none" }}>
                {week.map((day, di) => {
                  if (!day) return <div key={di} style={{ minHeight: 110, background: "#fafafa", borderRight: di < 6 ? "1px solid #e2e8f0" : "none" }} />;

                  const isToday = day === today;
                  const isWe = isWeekend(day);

                  const myDayShifts = tab === "meine"
                    ? myShifts.filter(s => s.date === day).sort((a,b) => a.start_time.localeCompare(b.start_time))
                    : allShifts.filter(s => s.user_id === myUserId && s.date === day).sort((a,b) => a.start_time.localeCompare(b.start_time));
                  const myDayAbsences = tab === "meine"
                    ? myAbsences.filter(a => a.status !== "abgelehnt" && a.date_from <= day && a.date_to >= day)
                    : allAbsences.filter(a => a.user_id === myUserId && a.status !== "abgelehnt" && a.date_from <= day && a.date_to >= day);

                  const allDayShifts = tab === "alle"
                    ? allShifts.filter(s => s.date === day)
                    : [];

                  const note = dayNotes[day];

                  return (
                    <div key={day} style={{ minHeight: 110, padding: 6, borderRight: di < 6 ? "1px solid #e2e8f0" : "none", background: isToday ? "#f0fdf4" : isWe ? "#fafafa" : "#fff", position: "relative" }}>
                      {/* Datum */}
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                        <span style={{
                          fontSize: 13, fontWeight: 700,
                          color: isToday ? "#fff" : isWe ? "#94a3b8" : "#334155",
                          background: isToday ? "#15803d" : "transparent",
                          borderRadius: "50%", width: 24, height: 24,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0
                        }}>
                          {parseInt(day.slice(8))}
                        </span>
                        {note && (
                          <span style={{ fontSize: 10, color: "#15803d", background: "#dcfce7", borderRadius: 4, padding: "1px 5px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "calc(100% - 30px)" }}>{note}</span>
                        )}
                      </div>

                      {/* Eigene Schichten / Abwesenheiten */}
                      {myDayAbsences.map(a => <AbsencePill key={`a${a.id}`} a={a} />)}
                      {myDayShifts.map(s => <ShiftPill key={s.id} s={s} />)}

                      {/* Alle Mitarbeiter Tab: andere Mitarbeiter kompakt */}
                      {tab === "alle" && allDayShifts.filter(s => s.user_id !== myUserId).length > 0 && (
                        <div style={{ marginTop: 3, borderTop: myDayShifts.length > 0 ? "1px dashed #e2e8f0" : "none", paddingTop: myDayShifts.length > 0 ? 3 : 0 }}>
                          {allDayShifts.filter(s => s.user_id !== myUserId).map(s => (
                            <div key={s.id} style={{ fontSize: 10, color: "#64748b", borderLeft: `2px solid ${s.shift_type_color || DEFAULT_COLOR}`, paddingLeft: 4, marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {s.user_name || "?"}: {s.shift_type_name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── MONATSANSICHT ALLE (scrollbare Tabelle wie Dienstplan) ── */}
      {view === "monat" && tab === "alle" && (() => {
        const allMonthDays = monthDays.filter(day => {
          if (!isWeekend(day)) return true;
          return allShifts.some(s => s.date === day) || allAbsences.some(a => a.status !== "abgelehnt" && a.date_from <= day && a.date_to >= day);
        });
        const tWidth = COL_NAME + allMonthDays.length * COL_DAY;
        return (
          <div style={{ overflowX: "auto", borderRadius: 16, border: "1px solid #e2e8f0", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <table style={{ borderCollapse: "collapse", width: `${tWidth}px`, minWidth: "100%" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ width: COL_NAME, minWidth: COL_NAME, padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748b", borderBottom: "1px solid #e2e8f0", position: "sticky", left: 0, background: "#f8fafc", zIndex: 2 }}>Mitarbeiter</th>
                  {allMonthDays.map(day => (
                    <th key={day} style={{ width: COL_DAY, minWidth: COL_DAY, padding: "6px 4px", textAlign: "center", fontSize: 11, fontWeight: 700, color: day === today ? "#15803d" : isWeekend(day) ? "#94a3b8" : "#475569", borderBottom: "1px solid #e2e8f0", borderLeft: "1px solid #e2e8f0", background: day === today ? "#f0fdf4" : "#f8fafc", verticalAlign: "top" }}>
                      {formatDayShort(day)}
                      {day === today && <div style={{ fontSize: 10, fontWeight: 400, color: "#16a34a" }}>Heute</div>}
                      {dayNotes[day] && <div style={{ marginTop: 3, fontSize: 10, fontWeight: 500, color: "#15803d", background: "#dcfce7", borderRadius: 4, padding: "1px 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dayNotes[day]}</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={allMonthDays.length + 1} style={{ padding: 24, textAlign: "center", fontSize: 13, color: "#94a3b8" }}>Lade…</td></tr>
                ) : groupedUsers.length === 0 ? (
                  <tr><td colSpan={allMonthDays.length + 1} style={{ padding: 24, textAlign: "center", fontSize: 13, color: "#94a3b8" }}>Keine Mitarbeiter gefunden.</td></tr>
                ) : (
                  groupedUsers.map(u => (
                    <tr key={u.id} style={{ background: u.id === myUserId ? "#f0fdf4" : "#fff" }}>
                      <td style={{ width: COL_NAME, minWidth: COL_NAME, padding: "8px 12px", borderBottom: "1px solid #e2e8f0", position: "sticky", left: 0, background: u.id === myUserId ? "#f0fdf4" : "#fff", zIndex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className={`grid place-items-center rounded-full text-xs font-bold flex-shrink-0 ${userAvatarColor(u.name)}`} style={{ width: 30, height: 30, fontSize: 11 }}>{getInitials(u.name)}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", lineHeight: 1.3 }}>
                            {u.name}
                            {u.id === myUserId && <div style={{ fontSize: 10, color: "#16a34a" }}>(ich)</div>}
                          </div>
                        </div>
                      </td>
                      {allMonthDays.map(day => {
                        const dayShifts = allShifts.filter(s => s.user_id === u.id && s.date === day).sort((a,b) => a.start_time.localeCompare(b.start_time));
                        const dayAbsences = allAbsences.filter(a => a.user_id === u.id && a.status !== "abgelehnt" && a.date_from <= day && a.date_to >= day);
                        return (
                          <td key={day} style={{ verticalAlign: "top", padding: 6, borderLeft: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", minWidth: COL_DAY, background: day === today ? (u.id === myUserId ? "#dcfce7" : "#f0fdf4") : (u.id === myUserId ? "#f0fdf4" : isWeekend(day) ? "#fafafa" : "#fff") }}>
                            <TableCellContent shifts={dayShifts} absences={dayAbsences} />
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        );
      })()}

      <p style={{ textAlign: "center", fontSize: 11, color: "#a1a1aa", marginTop: 24 }}>
        © {new Date().getFullYear()} Workplan by Oswald-IT
      </p>
    </div>
  );
}
