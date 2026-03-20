"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import Badge from "@/components/ui/badge";
import SectionCard from "@/components/ui/section-card";
import AppButton from "@/components/ui/app-button";
import AlertBox from "@/components/ui/alert-box";
import FormField from "@/components/ui/form-field";
import TextInput from "@/components/ui/text-input";
import SelectInput from "@/components/ui/select-input";
import CheckboxInput from "@/components/ui/checkbox-input";

type Shift = {
  id: number;
  user_id: number;
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

type MeUser = {
  id: number;
  email: string;
  role: string | null;
  is_active: boolean;
};

type UserOption = {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  email?: string | null;
  is_active?: boolean;
};

type ShiftTypeOption = {
  id: number;
  name: string;
  break_minutes_default?: number;
  fixed_start_time?: string | null;
  fixed_end_time?: string | null;
  color?: string | null;
  counts_as_work: boolean;
  is_flexible_default: boolean;
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

type SelectedCell = { user_id: number; date: string } | null;

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

function formatDayHeader(dateIso: string) {
  return new Date(dateIso).toLocaleDateString("de-CH", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function isToday(dateIso: string) { return dateIso === todayIso(); }

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

function shiftCardStyle(color?: string | null) {
  const c = color || DEFAULT_COLOR;
  return { borderLeft: `4px solid ${c}`, backgroundColor: `${c}12`, color: "#0f172a" } as React.CSSProperties;
}

const COL_NAME = 200;
const COL_DAY = 120;

export default function DienstplanPage() {
  const [forbidden, setForbidden] = useState(false);
  const [view, setView] = useState<"woche" | "monat">("woche");
  const [weekStart, setWeekStart] = useState(startOfWeekIso());
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [items, setItems] = useState<Shift[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftTypeOption[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [selectedCell, setSelectedCell] = useState<SelectedCell>(null);
  const [quickShiftTypeId, setQuickShiftTypeId] = useState("");
  const [quickNotes, setQuickNotes] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);
  const [dayNotes, setDayNotes] = useState<Record<string, string>>({});
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [form, setForm] = useState({
    user_id: "", shift_type_id: "", date: todayIso(),
    start_time: "08:00", end_time: "17:00", is_flexible: false, notes: "",
  });

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd = weekDays[6];

  const monthDays = useMemo(() => {
    const count = new Date(year, month, 0).getDate();
    return Array.from({ length: count }, (_, i) => `${year}-${String(month).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`);
  }, [year, month]);

  const displayDays = view === "woche" ? weekDays : monthDays;
  const from = view === "woche" ? weekStart : `${year}-${String(month).padStart(2,"0")}-01`;
  const to = view === "woche" ? weekEnd : new Date(year, month, 0).toISOString().slice(0, 10);
  const tableWidth = COL_NAME + displayDays.length * COL_DAY;

  const periodLabel = view === "woche"
    ? `${formatDayHeader(weekStart)} – ${formatDayHeader(weekEnd)}`
    : `${MONTHS[month - 1]} ${year}`;

  async function loadMe() {
    try {
      const me: MeUser = await api.me();
      if (me?.role !== "admin") setForbidden(true);
    } catch { setForbidden(true); }
  }

  async function loadLookups() {
    try {
      const [usersData, shiftTypesData] = await Promise.all([api.users(), api.shiftTypes()]);
      const normalizedUsers = Array.isArray(usersData) ? usersData : [];
      const normalizedShiftTypes = Array.isArray(shiftTypesData) ? shiftTypesData : [];
      setUsers(normalizedUsers);
      setShiftTypes(normalizedShiftTypes);
      if (normalizedUsers.length > 0) setForm(p => ({ ...p, user_id: p.user_id || String(normalizedUsers[0].id) }));
      if (normalizedShiftTypes.length > 0) setForm(p => ({ ...p, shift_type_id: p.shift_type_id || String(normalizedShiftTypes[0].id) }));
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Daten konnten nicht geladen werden" });
    }
  }

  async function loadShifts() {
    setLoading(true);
    setMsg(null);
    try {
      const [shiftsData, absenceData, notesData] = await Promise.all([
        api.shifts(from, to),
        api.allAbsences({ from, to }),
        api.getDayNotes(from, to),
      ]);
      setItems(Array.isArray(shiftsData) ? shiftsData : []);
      setAbsences(Array.isArray(absenceData) ? absenceData : []);
      const notesMap: Record<string, string> = {};
      if (Array.isArray(notesData)) notesData.forEach((n: any) => { notesMap[n.date] = n.note; });
      setDayNotes(notesMap);
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Dienstplan konnte nicht geladen werden" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadMe(); loadLookups(); }, []);
  useEffect(() => { if (!forbidden) loadShifts(); }, [from, to, forbidden]);

  const groupedUsers = useMemo(() =>
    [...users]
      .filter(u => u.is_active !== false)
      .map(u => ({ id: u.id, name: displayUser(u), sort_order: (u as any).sort_order ?? 0 }))
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [users]
  );

  function shiftsFor(userId: number, day: string) {
    return items.filter(s => s.user_id === userId && s.date === day);
  }
  function absencesFor(userId: number, day: string) {
    return absences.filter(a => a.user_id === userId && a.status !== "abgelehnt" && a.date_from <= day && a.date_to >= day);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.createShift({ user_id: Number(form.user_id), shift_type_id: Number(form.shift_type_id), date: form.date, start_time: form.start_time, end_time: form.end_time, is_flexible: form.is_flexible, notes: form.notes || null });
      setMsg({ type: "ok", text: "✅ Schicht erstellt" });
      setForm(p => ({ ...p, notes: "" }));
      await loadShifts();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Schicht konnte nicht erstellt werden" });
    }
  }

  async function onDelete(id: number) {
    if (!window.confirm("Schicht wirklich löschen?")) return;
    try {
      await api.deleteShift(id);
      setMsg({ type: "ok", text: "✅ Schicht gelöscht" });
      await loadShifts();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Schicht konnte nicht gelöscht werden" });
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

  async function saveNote(day: string, note: string) {
    try {
      if (note.trim()) {
        await api.upsertDayNote(day, note.trim());
        setDayNotes(prev => ({ ...prev, [day]: note.trim() }));
      } else {
        await api.deleteDayNote(day);
        setDayNotes(prev => { const n = { ...prev }; delete n[day]; return n; });
      }
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Notiz konnte nicht gespeichert werden" });
    }
    setEditingNote(null);
    setNoteText("");
  }

  function openQuickCreate(userId: number, day: string) {
    setSelectedCell({ user_id: userId, date: day });
    setQuickShiftTypeId(shiftTypes[0] ? String(shiftTypes[0].id) : "");
    setQuickNotes("");
    setMsg(null);
  }

  function closeQuickCreate() {
    setSelectedCell(null);
    setQuickShiftTypeId("");
    setQuickNotes("");
  }

  async function saveQuickShift() {
    if (!selectedCell || !quickShiftTypeId) return;
    const st = shiftTypes.find(x => String(x.id) === quickShiftTypeId);
    if (!st) return;
    setQuickSaving(true);
    try {
      await api.createShift({ user_id: selectedCell.user_id, shift_type_id: st.id, date: selectedCell.date, start_time: st.fixed_start_time || "08:00", end_time: st.fixed_end_time || "17:00", is_flexible: st.is_flexible_default, notes: quickNotes || null });
      setMsg({ type: "ok", text: "✅ Schicht eingetragen" });
      closeQuickCreate();
      await loadShifts();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Schicht konnte nicht eingetragen werden" });
    } finally {
      setQuickSaving(false);
    }
  }

  const selectedUserName = selectedCell ? groupedUsers.find(x => x.id === selectedCell.user_id)?.name ?? "—" : "—";
  const selectedShiftType = shiftTypes.find(x => String(x.id) === quickShiftTypeId) ?? null;

  if (forbidden) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl/30">
          <h1 className="text-xl font-bold text-slate-900">Dienstplan</h1>
          <AlertBox variant="err" className="mt-4">Kein Zugriff. Diese Seite ist nur für Admins.</AlertBox>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-10">
      {/* Header + Controls - max width */}
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-6">

          {/* Titel + Navigation */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Dienstplan</h1>
              <p className="mt-1 text-sm text-slate-500">Auf eine Zelle klicken um schnell eine Schicht einzutragen.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                <button onClick={() => setView("woche")} className={`px-4 py-2 text-sm font-semibold transition ${view === "woche" ? "bg-green-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>Woche</button>
                <button onClick={() => setView("monat")} className={`px-4 py-2 text-sm font-semibold transition border-l border-slate-200 ${view === "monat" ? "bg-green-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>Monat</button>
              </div>
              <AppButton type="button" variant="secondary" onClick={prevPeriod} className="px-4 py-2 text-sm">←</AppButton>
              <span className="text-sm font-semibold text-slate-700 min-w-[140px] text-center">{periodLabel}</span>
              <AppButton type="button" variant="secondary" onClick={nextPeriod} className="px-4 py-2 text-sm">→</AppButton>
              <AppButton type="button" onClick={goToday} className="px-4 py-2 text-sm">Heute</AppButton>
            </div>
          </div>

          {/* Neue Schicht Formular */}
          <SectionCard title="Neue Schicht anlegen">
            <form onSubmit={onCreate} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField label="Mitarbeiter" htmlFor="user_id">
                <SelectInput id="user_id" title="Mitarbeiter" value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })} required>
                  <option value="">Bitte wählen</option>
                  {groupedUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </SelectInput>
              </FormField>
              <FormField label="Schichttyp" htmlFor="shift_type_id">
                <SelectInput id="shift_type_id" title="Schichttyp" value={form.shift_type_id} onChange={e => setForm({ ...form, shift_type_id: e.target.value })} required>
                  <option value="">Bitte wählen</option>
                  {shiftTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                </SelectInput>
              </FormField>
              <FormField label="Datum" htmlFor="date">
                <TextInput id="date" title="Datum" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              </FormField>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Flexibel</label>
                <CheckboxInput id="flex" title="Flexibel" checked={form.is_flexible} onChange={e => setForm({ ...form, is_flexible: e.target.checked })} label="Flexibel" className="h-[50px]" />
              </div>
              <FormField label="Start" htmlFor="start_time">
                <TextInput id="start_time" title="Startzeit" type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} required />
              </FormField>
              <FormField label="Ende" htmlFor="end_time">
                <TextInput id="end_time" title="Endzeit" type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} required />
              </FormField>
              <div className="xl:col-span-2">
                <FormField label="Notiz" htmlFor="notes">
                  <TextInput id="notes" title="Notiz" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </FormField>
              </div>
              <div className="md:col-span-2 xl:col-span-4">
                <AppButton type="submit">Schicht speichern</AppButton>
              </div>
            </form>
          </SectionCard>

          {msg && <AlertBox variant={msg.type}>{msg.text}</AlertBox>}

          {/* Quick Create Modal - via Portal */}
          {selectedCell && typeof window !== "undefined" && createPortal(
            <div
              onClick={closeQuickCreate}
              style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{ background: "#fff", borderRadius: 20, padding: 24, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: 0 }}>Schicht eintragen</h2>
                  <button onClick={closeQuickCreate} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#64748b", lineHeight: 1 }}>×</button>
                </div>

                <div style={{ background: "#f8fafc", borderRadius: 12, padding: "12px 16px", marginBottom: 12, fontSize: 14, color: "#475569" }}>
                  <div><span style={{ fontWeight: 600, color: "#0f172a" }}>{selectedUserName}</span></div>
                  <div style={{ marginTop: 4 }}>{selectedCell.date}</div>
                  <div style={{ marginTop: 10 }}>
                    <input
                      type="text"
                      value={quickNotes}
                      onChange={e => setQuickNotes(e.target.value)}
                      placeholder="Notiz zum Datum (optional)"
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a", outline: "none", boxSizing: "border-box", background: "#fff" }}
                    />
                  </div>
                </div>

                {selectedShiftType && (
                  <div style={{ borderRadius: 12, padding: "10px 14px", marginBottom: 16, borderLeft: `4px solid ${selectedShiftType.color || DEFAULT_COLOR}`, backgroundColor: `${selectedShiftType.color || DEFAULT_COLOR}15` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: selectedShiftType.color || DEFAULT_COLOR, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: "#0f172a", fontSize: 14 }}>{selectedShiftType.name}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                      {selectedShiftType.fixed_start_time && selectedShiftType.fixed_end_time
                        ? `${selectedShiftType.fixed_start_time} – ${selectedShiftType.fixed_end_time}`
                        : "08:00 – 17:00"} · Pause: {selectedShiftType.break_minutes_default ?? 0} min
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>Schichtvorlage</label>
                  <select
                    value={quickShiftTypeId}
                    onChange={e => setQuickShiftTypeId(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, color: "#0f172a", outline: "none" }}
                  >
                    <option value="">Bitte wählen</option>
                    {shiftTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                  </select>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={saveQuickShift}
                    disabled={!quickShiftTypeId || quickSaving}
                    style={{ flex: 1, padding: "12px 0", background: quickShiftTypeId && !quickSaving ? "#15803d" : "#9ca3af", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: quickShiftTypeId && !quickSaving ? "pointer" : "not-allowed" }}
                  >
                    {quickSaving ? "Speichert..." : "Schicht eintragen"}
                  </button>
                  <button
                    onClick={closeQuickCreate}
                    style={{ padding: "12px 20px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Schichtvorlagen Legende */}
          <SectionCard title="Schichtvorlagen" right={<Badge variant="slate">{shiftTypes.length}</Badge>}>
            <div className="flex flex-wrap gap-3">
              {shiftTypes.length === 0 ? (
                <AlertBox variant="info">Keine Schichttypen gefunden.</AlertBox>
              ) : (
                shiftTypes.map(st => (
                  <div key={st.id} className="rounded-xl p-3 shadow-sm ring-1 ring-slate-200 flex items-center gap-2" style={{ borderLeft: `4px solid ${st.color || DEFAULT_COLOR}`, backgroundColor: `${st.color || DEFAULT_COLOR}12` }}>
                    <div className="h-4 w-4 rounded-full ring-1 ring-slate-200 flex-shrink-0" style={{ backgroundColor: st.color || DEFAULT_COLOR }} />
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{st.name}</div>
                      <div className="text-xs text-slate-700">{st.fixed_start_time && st.fixed_end_time ? `${st.fixed_start_time}–${st.fixed_end_time}` : "Keine fixe Zeit"} · Pause: {st.break_minutes_default ?? 0} min</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

        </div>
      </div>

      {/* Kalender - volle Breite mit Scroll */}
      <div className="mx-auto mt-6 max-w-6xl">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl/30">
          <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-3">
            <h2 className="text-lg font-bold text-slate-900">Kalender</h2>
            <div>{loading ? <Badge variant="slate">Lade…</Badge> : <Badge variant="green">OK</Badge>}</div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ width: `${tableWidth}px`, minWidth: "100%" }}>
              {/* Header */}
              <div className="grid border-b border-slate-200 bg-slate-50" style={{ gridTemplateColumns: `${COL_NAME}px repeat(${displayDays.length}, ${COL_DAY}px)` }}>
                <div className="p-3 text-sm font-bold text-slate-600" style={{ position: "sticky", left: 0, background: "#f8fafc", zIndex: 2 }}>Mitarbeiter</div>
                {displayDays.map(day => (
                  <div key={day} className={`border-l border-slate-200 p-2 text-center text-xs font-bold ${isToday(day) ? "bg-green-50 text-green-800" : "text-slate-700"}`}>
                    {formatDayHeader(day)}
                    {isToday(day) && <div className="text-xs font-normal text-green-600">Heute</div>}
                    {/* Tagesnotiz */}
                    {editingNote === day ? (
                      <div onClick={e => e.stopPropagation()} className="mt-1">
                        <input
                          autoFocus
                          type="text"
                          value={noteText}
                          onChange={e => setNoteText(e.target.value)}
                          onBlur={() => saveNote(day, noteText)}
                          onKeyDown={e => { if (e.key === "Enter") saveNote(day, noteText); if (e.key === "Escape") { setEditingNote(null); setNoteText(""); } }}
                          placeholder="Notiz..."
                          style={{ width: "100%", fontSize: 10, padding: "2px 6px", borderRadius: 6, border: "1px solid #86efac", outline: "none", textAlign: "left", boxSizing: "border-box" }}
                        />
                      </div>
                    ) : (
                      <div
                        onClick={e => { e.stopPropagation(); setEditingNote(day); setNoteText(dayNotes[day] || ""); }}
                        className="mt-1 cursor-pointer rounded text-left"
                        style={{ fontSize: 10, minHeight: 16, padding: "1px 4px", color: dayNotes[day] ? "#15803d" : "#cbd5e1", fontWeight: dayNotes[day] ? 600 : 400 }}
                        title="Klicken um Notiz zu bearbeiten"
                      >
                        {dayNotes[day] || "+ Notiz"}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Zeilen */}
              {loading ? (
                <div className="p-6 text-sm text-slate-500">Lade Dienstplan…</div>
              ) : groupedUsers.length === 0 ? (
                <div className="p-6 text-sm text-slate-500">Keine aktiven Mitarbeiter gefunden.</div>
              ) : (
                groupedUsers.map(u => (
                  <div key={u.id} className="grid border-b border-slate-200 last:border-b-0" style={{ gridTemplateColumns: `${COL_NAME}px repeat(${displayDays.length}, ${COL_DAY}px)` }}>
                    {/* Name - sticky */}
                    <div className="flex items-center border-r border-slate-200 p-3" style={{ position: "sticky", left: 0, background: "#fff", zIndex: 1 }}>
                      <div className="flex items-center gap-2">
                        <div className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-full text-xs font-bold ${userAvatarColor(u.name)}`}>{getInitials(u.name)}</div>
                        <div className="text-sm font-semibold text-slate-900 leading-tight">{u.name}</div>
                      </div>
                    </div>

                    {/* Tage */}
                    {displayDays.map(day => {
                      const dayShifts = shiftsFor(u.id, day);
                      const dayAbsences = absencesFor(u.id, day);
                      const isSelected = selectedCell?.user_id === u.id && selectedCell?.date === day;

                      return (
                        <div
                          key={day}
                          onClick={() => openQuickCreate(u.id, day)}
                          className={`min-h-[90px] cursor-pointer border-l border-slate-200 p-1.5 transition ${
                            isSelected ? "bg-green-50 ring-2 ring-inset ring-green-400"
                            : isToday(day) ? "bg-green-50/40 hover:bg-green-50"
                            : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex flex-col gap-1">
                            {dayAbsences.map(a => {
                              const info = ABSENCE_TYPES[a.type] ?? { label: a.type, color: "#888780" };
                              return (
                                <div key={`abs-${a.id}`} onClick={e => e.stopPropagation()} className="rounded-md p-1 text-xs font-semibold" style={{ backgroundColor: `${info.color}20`, borderLeft: `3px solid ${info.color}`, color: "#0f172a" }}>
                                  {info.label}{a.status === "beantragt" && " (?)"}
                                </div>
                              );
                            })}
                            {dayShifts.length === 0 && dayAbsences.length === 0 && (
                              <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs font-semibold text-slate-400 hover:border-green-300 hover:text-green-500 min-h-[70px]">+ Schicht</div>
                            )}
                            {dayShifts.map(s => (
                              <div key={s.id} onClick={e => e.stopPropagation()} className="rounded-lg p-1.5 ring-1 ring-slate-200" style={shiftCardStyle(s.shift_type_color)}>
                                <div className="flex items-start justify-between gap-1">
                                  <div>
                                    <div className="text-xs font-bold leading-tight">{s.shift_type_name || "Schicht"}</div>
                                    <div className="text-xs opacity-70">{s.start_time}–{s.end_time}</div>
                                  </div>
                                  <button onClick={() => onDelete(s.id)} className="flex-shrink-0 rounded px-1 text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-700">×</button>
                                </div>
                                {s.notes && <div className="mt-1 text-xs opacity-70 truncate">{s.notes}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-zinc-400">
        © {new Date().getFullYear()} Workplan by Oswald-IT
      </p>
    </div>
  );
}
