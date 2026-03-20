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
import TextInput from "@/components/ui/text-input";
import SelectInput from "@/components/ui/select-input";
import CheckboxInput from "@/components/ui/checkbox-input";

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

type MeUser = {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
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
  user_name?: string | null;
  type: string;
  status: string;
  date_from: string;
  date_to: string;
  notes?: string | null;
};

const ABSENCE_TYPES: Record<string, { label: string; color: string }> = {
  urlaub:        { label: "Urlaub",             color: "#1D9E75" },
  krankheit:     { label: "Krankheit",          color: "#E24B4A" },
  feiertag:      { label: "Feiertag",           color: "#378ADD" },
  weiterbildung: { label: "Weiterbildung",      color: "#7F77DD" },
  unbezahlt:     { label: "Unbezahlter Urlaub", color: "#888780" },
  schule:        { label: "Schule",             color: "#BA7517" },
};

type SelectedCell = { user_id: number; date: string } | null;

const DEFAULT_COLOR = "#2563eb";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function startOfWeekIso() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateIso: string, days: number) {
  const d = new Date(dateIso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDayHeader(dateIso: string) {
  const d = new Date(dateIso);
  return d.toLocaleDateString("de-CH", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function isToday(dateIso: string) {
  return dateIso === todayIso();
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
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-fuchsia-100 text-fuchsia-700",
    "bg-emerald-100 text-emerald-700",
    "bg-orange-100 text-orange-700",
    "bg-violet-100 text-violet-700",
    "bg-cyan-100 text-cyan-700",
    "bg-amber-100 text-amber-700",
    "bg-lime-100 text-lime-700",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function shiftCardStyle(color?: string | null) {
  const c = color || DEFAULT_COLOR;
  return {
    borderLeft: `4px solid ${c}`,
    backgroundColor: `${c}12`,
    color: "#0f172a",
  } as React.CSSProperties;
}

export default function DienstplanPage() {
  const [forbidden, setForbidden] = useState(false);
  const [weekStart, setWeekStart] = useState(startOfWeekIso());
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

  const [form, setForm] = useState({
    user_id: "",
    shift_type_id: "",
    date: todayIso(),
    start_time: "08:00",
    end_time: "17:00",
    is_flexible: false,
    notes: "",
  });

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const weekEnd = weekDays[6];

  async function loadMe() {
    try {
      const me: MeUser = await api.me();
      if (me?.role !== "admin") setForbidden(true);
    } catch {
      setForbidden(true);
    }
  }

  async function loadLookups() {
    try {
      const [usersData, shiftTypesData] = await Promise.all([
        api.users(),
        api.shiftTypes(),
      ]);

      const normalizedUsers = Array.isArray(usersData) ? usersData : usersData?.items ?? [];
      const normalizedShiftTypes = Array.isArray(shiftTypesData) ? shiftTypesData : shiftTypesData?.items ?? [];

      setUsers(normalizedUsers);
      setShiftTypes(normalizedShiftTypes);

      if (normalizedUsers.length > 0) {
        setForm((prev) => ({ ...prev, user_id: prev.user_id || String(normalizedUsers[0].id) }));
      }
      if (normalizedShiftTypes.length > 0) {
        setForm((prev) => ({ ...prev, shift_type_id: prev.shift_type_id || String(normalizedShiftTypes[0].id) }));
      }
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Daten konnten nicht geladen werden" });
    }
  }

  async function loadShifts() {
    setLoading(true);
    setMsg(null);
    try {
      const [shiftsData, absenceData] = await Promise.all([
        api.shifts(weekStart, weekEnd),
        api.allAbsences({ from: weekStart, to: weekEnd }),
      ]);
      setItems(Array.isArray(shiftsData) ? shiftsData : []);
      setAbsences(Array.isArray(absenceData) ? absenceData : []);
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Dienstplan konnte nicht geladen werden" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
    loadLookups();
  }, []);

  useEffect(() => {
    if (!forbidden) loadShifts();
  }, [weekStart, forbidden]);

  const groupedUsers = useMemo(() => {
    return [...users]
      .filter((u) => u.is_active !== false)
      .map((u) => ({ id: u.id, name: displayUser(u) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  function shiftsFor(userId: number, day: string) {
    return items.filter((s) => s.user_id === userId && s.date === day);
  }

  function absencesFor(userId: number, day: string) {
    return absences.filter(
      (a) => a.user_id === userId && a.status !== "abgelehnt" && a.date_from <= day && a.date_to >= day
    );
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.createShift({
        user_id: Number(form.user_id),
        shift_type_id: Number(form.shift_type_id),
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        is_flexible: form.is_flexible,
        notes: form.notes || null,
      });
      setMsg({ type: "ok", text: "✅ Schicht erstellt" });
      setForm((prev) => ({ ...prev, notes: "" }));
      await loadShifts();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Schicht konnte nicht erstellt werden" });
    }
  }

  async function onDelete(id: number) {
    const ok = window.confirm("Schicht wirklich löschen?");
    if (!ok) return;
    try {
      await api.deleteShift(id);
      setMsg({ type: "ok", text: "✅ Schicht gelöscht" });
      await loadShifts();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Schicht konnte nicht gelöscht werden" });
    }
  }

  function prevWeek() { setWeekStart(addDays(weekStart, -7)); }
  function nextWeek() { setWeekStart(addDays(weekStart, 7)); }

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
    const st = shiftTypes.find((x) => String(x.id) === quickShiftTypeId);
    if (!st) return;
    setQuickSaving(true);
    try {
      await api.createShift({
        user_id: selectedCell.user_id,
        shift_type_id: st.id,
        date: selectedCell.date,
        start_time: st.fixed_start_time || "08:00",
        end_time: st.fixed_end_time || "17:00",
        is_flexible: st.is_flexible_default,
        notes: quickNotes || null,
      });
      setMsg({ type: "ok", text: "✅ Schicht eingetragen" });
      closeQuickCreate();
      await loadShifts();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Schicht konnte nicht eingetragen werden" });
    } finally {
      setQuickSaving(false);
    }
  }

  const selectedUserName = selectedCell
    ? groupedUsers.find((x) => x.id === selectedCell.user_id)?.name ?? "—"
    : "—";

  const selectedShiftType = shiftTypes.find((x) => String(x.id) === quickShiftTypeId) ?? null;

  if (forbidden) {
    return (
      <PageContainer>
        <SectionCard>
          <h1 className="text-xl font-bold text-slate-900">Dienstplan</h1>
          <AlertBox variant="err" className="mt-4">
            Kein Zugriff. Diese Seite ist nur für Admins.
          </AlertBox>
        </SectionCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="grid gap-6">
        <PageHeader
          title="Dienstplan"
          subtitle="Wochenansicht – auf eine Zelle klicken um schnell eine Schicht einzutragen."
          actions={
            <>
              <AppButton type="button" variant="secondary" onClick={prevWeek} className="px-4 py-2 text-sm">
                ← Woche zurück
              </AppButton>
              <AppButton type="button" onClick={() => setWeekStart(startOfWeekIso())} className="px-4 py-2 text-sm">
                Heute
              </AppButton>
              <AppButton type="button" variant="secondary" onClick={nextWeek} className="px-4 py-2 text-sm">
                Woche vor →
              </AppButton>
            </>
          }
        />

        {/* Neue Schicht (detailliertes Formular) */}
        <SectionCard title="Neue Schicht anlegen">
          <form onSubmit={onCreate} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FormField label="Mitarbeiter" htmlFor="user_id">
              <SelectInput
                id="user_id"
                title="Mitarbeiter"
                value={form.user_id}
                onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                required
              >
                <option value="">Bitte wählen</option>
                {users
                  .filter((u) => u.is_active !== false)
                  .sort((a, b) => displayUser(a).localeCompare(displayUser(b)))
                  .map((u) => (
                    <option key={u.id} value={u.id}>{displayUser(u)}</option>
                  ))}
              </SelectInput>
            </FormField>

            <FormField label="Schichttyp" htmlFor="shift_type_id">
              <SelectInput
                id="shift_type_id"
                title="Schichttyp"
                value={form.shift_type_id}
                onChange={(e) => setForm({ ...form, shift_type_id: e.target.value })}
                required
              >
                <option value="">Bitte wählen</option>
                {shiftTypes.map((st) => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </SelectInput>
            </FormField>

            <FormField label="Datum" htmlFor="date">
              <TextInput
                id="date"
                title="Datum"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </FormField>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Flexibel</label>
              <CheckboxInput
                id="flex"
                title="Flexibel"
                checked={form.is_flexible}
                onChange={(e) => setForm({ ...form, is_flexible: e.target.checked })}
                label="Flexibel"
                className="h-[50px]"
              />
            </div>

            <FormField label="Start" htmlFor="start_time">
              <TextInput
                id="start_time"
                title="Startzeit"
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Ende" htmlFor="end_time">
              <TextInput
                id="end_time"
                title="Endzeit"
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                required
              />
            </FormField>

            <div className="xl:col-span-2">
              <FormField label="Notiz" htmlFor="notes">
                <TextInput
                  id="notes"
                  title="Notiz"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </FormField>
            </div>

            <div className="md:col-span-2 xl:col-span-4">
              <AppButton type="submit">Schicht speichern</AppButton>
            </div>
          </form>
        </SectionCard>

        {msg && <AlertBox variant={msg.type}>{msg.text}</AlertBox>}

        {/* Schnell-Eintragen Panel (Inline statt Modal) */}
        {selectedCell && (
          <SectionCard
            title="Schicht schnell eintragen"
            right={
              <AppButton type="button" variant="secondary" onClick={closeQuickCreate} className="px-3 py-1 text-xs">
                Schliessen
              </AppButton>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
                <div>Mitarbeiter: <span className="font-semibold text-slate-900">{selectedUserName}</span></div>
                <div className="mt-1">Datum: <span className="font-semibold text-slate-900">{selectedCell.date}</span></div>
              </div>

              {selectedShiftType && (
                <div
                  className="rounded-xl px-4 py-3 text-sm ring-1 ring-slate-200"
                  style={shiftCardStyle(selectedShiftType.color)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 w-4 rounded-full ring-1 ring-slate-200"
                      style={{ backgroundColor: selectedShiftType.color || DEFAULT_COLOR }}
                    />
                    <span className="font-semibold">{selectedShiftType.name}</span>
                  </div>
                  <div className="mt-1">
                    Zeit: {selectedShiftType.fixed_start_time && selectedShiftType.fixed_end_time
                      ? `${selectedShiftType.fixed_start_time} - ${selectedShiftType.fixed_end_time}`
                      : "08:00 - 17:00"}
                  </div>
                  <div className="mt-1">Pause: {selectedShiftType.break_minutes_default ?? 0} min</div>
                  <div className="mt-1">Stunden zählen: {selectedShiftType.counts_as_work ? "Ja" : "Nein"}</div>
                </div>
              )}

              <FormField label="Schichtvorlage" htmlFor="quick_shift_type">
                <SelectInput
                  id="quick_shift_type"
                  title="Schichtvorlage"
                  value={quickShiftTypeId}
                  onChange={(e) => setQuickShiftTypeId(e.target.value)}
                >
                  <option value="">Bitte wählen</option>
                  {shiftTypes.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </SelectInput>
              </FormField>

              <FormField label="Notiz" htmlFor="quick_notes">
                <TextInput
                  id="quick_notes"
                  title="Notiz"
                  value={quickNotes}
                  onChange={(e) => setQuickNotes(e.target.value)}
                  placeholder="Optional"
                />
              </FormField>

              <div className="flex gap-3 md:col-span-2">
                <AppButton
                  type="button"
                  onClick={saveQuickShift}
                  disabled={!quickShiftTypeId || quickSaving}
                >
                  {quickSaving ? "Speichert..." : "Schicht eintragen"}
                </AppButton>
                <AppButton type="button" variant="secondary" onClick={closeQuickCreate}>
                  Abbrechen
                </AppButton>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Kalender + Legende */}
        <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">

          {/* Schichtvorlagen Legende */}
          <SectionCard
            title="Schichtvorlagen"
            right={<Badge variant="slate">{shiftTypes.length}</Badge>}
          >
            <div className="space-y-3">
              {shiftTypes.length === 0 ? (
                <AlertBox variant="info">Keine Schichttypen gefunden.</AlertBox>
              ) : (
                shiftTypes.map((st) => (
                  <div
                    key={st.id}
                    className="rounded-xl p-3 shadow-sm ring-1 ring-slate-200"
                    style={{ borderLeft: `4px solid ${st.color || DEFAULT_COLOR}`, backgroundColor: `${st.color || DEFAULT_COLOR}12` }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full ring-1 ring-slate-200" style={{ backgroundColor: st.color || DEFAULT_COLOR }} />
                      <div className="font-semibold text-slate-900">{st.name}</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-700">
                      {st.fixed_start_time && st.fixed_end_time
                        ? `${st.fixed_start_time} – ${st.fixed_end_time}`
                        : "Keine fixe Zeit"}
                    </div>
                    <div className="mt-1 text-xs text-slate-700">
                      Pause: {st.break_minutes_default ?? 0} min · {st.counts_as_work ? "Zählt" : "Zählt nicht"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          {/* Kalender-Raster */}
          <SectionCard
            title="Kalender"
            right={loading ? <Badge variant="slate">Lade…</Badge> : <Badge variant="green">OK</Badge>}
          >
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                {/* Header Zeile */}
                <div className="grid grid-cols-[200px_repeat(7,minmax(110px,1fr))] border-b border-slate-200 bg-slate-50">
                  <div className="p-3 text-sm font-bold text-slate-600">Mitarbeiter</div>
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className={`border-l border-slate-200 p-3 text-center text-sm font-bold ${
                        isToday(day) ? "bg-green-50 text-green-800" : "text-slate-700"
                      }`}
                    >
                      {formatDayHeader(day)}
                      {isToday(day) && (
                        <div className="mt-1 text-xs font-normal text-green-600">Heute</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Mitarbeiter Zeilen */}
                {loading ? (
                  <div className="p-6 text-sm text-slate-500">Lade Dienstplan…</div>
                ) : groupedUsers.length === 0 ? (
                  <div className="p-6 text-sm text-slate-500">Keine aktiven Mitarbeiter gefunden.</div>
                ) : (
                  groupedUsers.map((u) => (
                    <div
                      key={u.id}
                      className="grid grid-cols-[200px_repeat(7,minmax(110px,1fr))] border-b border-slate-200 last:border-b-0"
                    >
                      {/* Name */}
                      <div className="flex items-center border-r border-slate-200 p-3">
                        <div className="flex items-center gap-2">
                          <div className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-full text-xs font-bold ${userAvatarColor(u.name)}`}>
                            {getInitials(u.name)}
                          </div>
                          <div className="text-sm font-semibold text-slate-900 leading-tight">{u.name}</div>
                        </div>
                      </div>

                      {/* Tage */}
                      {weekDays.map((day) => {
                        const dayShifts = shiftsFor(u.id, day);
                        const dayAbsences = absencesFor(u.id, day);
                        const isTodayCell = isToday(day);
                        const isSelected = selectedCell?.user_id === u.id && selectedCell?.date === day;

                        return (
                          <div
                            key={day}
                            onClick={() => openQuickCreate(u.id, day)}
                            className={`min-h-[100px] cursor-pointer border-l border-slate-200 p-2 transition ${
                              isSelected
                                ? "bg-green-50 ring-2 ring-inset ring-green-400"
                                : isTodayCell
                                ? "bg-green-50/40 hover:bg-green-50"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex h-full flex-col gap-1">
                              {dayAbsences.map((a) => {
                                const info = ABSENCE_TYPES[a.type] ?? { label: a.type, color: "#888780" };
                                return (
                                  <div
                                    key={`abs-${a.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="rounded-lg p-1.5 text-xs font-semibold ring-1 ring-slate-200"
                                    style={{ backgroundColor: `${info.color}20`, borderLeft: `3px solid ${info.color}`, color: "#0f172a" }}
                                  >
                                    {info.label}
                                    {a.status === "beantragt" && " (?)"}
                                  </div>
                                );
                              })}
                              {dayShifts.length === 0 && dayAbsences.length === 0 ? (
                                <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs font-semibold text-slate-400 hover:border-green-300 hover:text-green-500">
                                  + Schicht
                                </div>
                              ) : dayShifts.length === 0 ? null : null}

                              {dayShifts.map((s) => (
                                <div
                                  key={s.id}
                                  onClick={(e) => e.stopPropagation()}
                                  className="rounded-xl p-2 shadow-sm ring-1 ring-slate-200"
                                  style={shiftCardStyle(s.shift_type_color)}
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <div>
                                      <div className="text-xs font-bold leading-tight">
                                        {s.shift_type_name || "Schicht"}
                                      </div>
                                      <div className="text-xs opacity-80">
                                        {s.start_time}–{s.end_time}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => onDelete(s.id)}
                                      className="flex-shrink-0 rounded px-1 text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-700"
                                    >
                                      ×
                                    </button>
                                  </div>
                                  {s.notes && (
                                    <div className="mt-1 text-xs opacity-70 truncate">{s.notes}</div>
                                  )}
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
          </SectionCard>
        </div>

        <p className="text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} Workplan by Oswald-IT
        </p>
      </div>
    </PageContainer>
  );
}
