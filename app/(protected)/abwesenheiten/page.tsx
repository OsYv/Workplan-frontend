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

type Absence = {
  id: number;
  user_id: number;
  user_name?: string | null;
  type: string;
  status: string;
  date_from: string;
  date_to: string;
  notes?: string | null;
  approved_by?: number | null;
};

type UserOption = {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  email?: string | null;
  is_active?: boolean;
};

const ABSENCE_TYPES = [
  { value: "urlaub",        label: "Urlaub",             color: "#1D9E75" },
  { value: "krankheit",     label: "Krankheit",          color: "#E24B4A" },
  { value: "feiertag",      label: "Feiertag",           color: "#378ADD" },
  { value: "weiterbildung", label: "Weiterbildung",      color: "#7F77DD" },
  { value: "unbezahlt",     label: "Unbezahlter Urlaub", color: "#888780" },
  { value: "schule",        label: "Schule",             color: "#BA7517" },
];

function getTypeInfo(type: string) {
  return ABSENCE_TYPES.find((t) => t.value === type) ?? { value: type, label: type, color: "#888780" };
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function dayCount(from: string, to: string) {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.round((b - a) / 86400000) + 1;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function StatusBadge({ status }: { status: string }) {
  if (status === "genehmigt") return <Badge variant="green">Genehmigt</Badge>;
  if (status === "abgelehnt") return <Badge variant="red">Abgelehnt</Badge>;
  return <Badge variant="orange">Beantragt</Badge>;
}

function displayUser(u: UserOption) {
  const full = `${u.first_name?.trim() ?? ""} ${u.last_name?.trim() ?? ""}`.trim();
  return full || u.name?.trim() || u.email || `User ${u.id}`;
}

const EMPTY_FORM = {
  type: "urlaub",
  date_from: todayIso(),
  date_to: todayIso(),
  notes: "",
};

export default function AbwesenheitenPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [myAbsences, setMyAbsences] = useState<Absence[]>([]);
  const [allAbsences, setAllAbsences] = useState<Absence[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [adminForm, setAdminForm] = useState({ ...EMPTY_FORM, user_id: "" });
  const [filterStatus, setFilterStatus] = useState("alle");

  useEffect(() => {
    async function init() {
      try {
        const me = await api.me();
        const admin = me?.role === "admin";
        setIsAdmin(admin);

        const [myData, ...rest] = await Promise.all([
          api.myAbsences(),
          admin ? api.allAbsences() : Promise.resolve([]),
          admin ? api.users() : Promise.resolve([]),
        ]);

        setMyAbsences(Array.isArray(myData) ? myData : []);
        if (admin) {
          setAllAbsences(Array.isArray(rest[0]) ? rest[0] : []);
          const userList = Array.isArray(rest[1]) ? rest[1].filter((u: UserOption) => u.is_active !== false) : [];
          setUsers(userList);
          if (userList.length > 0) {
            setAdminForm((prev) => ({ ...prev, user_id: String(userList[0].id) }));
          }
        }
      } catch (e: any) {
        setMsg({ type: "err", text: e?.message ?? "Fehler beim Laden" });
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function reload() {
    try {
      const myData = await api.myAbsences();
      setMyAbsences(Array.isArray(myData) ? myData : []);
      if (isAdmin) {
        const allData = await api.allAbsences();
        setAllAbsences(Array.isArray(allData) ? allData : []);
      }
    } catch {}
  }

  async function submitMyAbsence(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.createMyAbsence({
        type: form.type,
        date_from: form.date_from,
        date_to: form.date_to,
        notes: form.notes || null,
      });
      setMsg({ type: "ok", text: "✅ Abwesenheit beantragt" });
      setForm({ ...EMPTY_FORM });
      await reload();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Fehler beim Beantragen" });
    }
  }

  async function submitAdminAbsence(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.adminCreateAbsence({
        user_id: Number(adminForm.user_id),
        type: adminForm.type,
        date_from: adminForm.date_from,
        date_to: adminForm.date_to,
        notes: adminForm.notes || null,
      });
      setMsg({ type: "ok", text: "✅ Abwesenheit eingetragen" });
      setAdminForm((prev) => ({ ...EMPTY_FORM, user_id: prev.user_id }));
      await reload();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Fehler beim Eintragen" });
    }
  }

  async function updateStatus(id: number, status: string) {
    setMsg(null);
    try {
      await api.updateAbsenceStatus(id, status);
      setMsg({ type: "ok", text: `✅ Abwesenheit ${status}` });
      await reload();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Fehler" });
    }
  }

  async function deleteAbsence(id: number, own = false) {
    const ok = window.confirm("Abwesenheit wirklich löschen?");
    if (!ok) return;
    setMsg(null);
    try {
      if (own) await api.deleteMyAbsence(id);
      else await api.deleteAbsence(id);
      setMsg({ type: "ok", text: "✅ Abwesenheit gelöscht" });
      await reload();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Fehler beim Löschen" });
    }
  }

  const filteredAbsences = useMemo(() => {
    if (filterStatus === "alle") return allAbsences;
    return allAbsences.filter((a) => a.status === filterStatus);
  }, [allAbsences, filterStatus]);

  const pendingCount = allAbsences.filter((a) => a.status === "beantragt").length;

  return (
    <PageContainer>
      <div className="grid gap-6">
        <PageHeader
          title="Abwesenheiten"
          subtitle="Urlaub, Krankheit und andere Abwesenheiten verwalten."
          actions={
            pendingCount > 0 && isAdmin ? (
              <Badge variant="orange">{pendingCount} offen</Badge>
            ) : undefined
          }
        />

        {msg && <AlertBox variant={msg.type}>{msg.text}</AlertBox>}

        {/* Meine Abwesenheit beantragen */}
        <SectionCard title="Abwesenheit beantragen">
          <form onSubmit={submitMyAbsence} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FormField label="Typ" htmlFor="type">
              <SelectInput
                id="type"
                title="Typ"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {ABSENCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </SelectInput>
            </FormField>

            <FormField label="Von" htmlFor="date_from">
              <TextInput
                id="date_from"
                title="Von"
                type="date"
                value={form.date_from}
                onChange={(e) => setForm({ ...form, date_from: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Bis" htmlFor="date_to">
              <TextInput
                id="date_to"
                title="Bis"
                type="date"
                value={form.date_to}
                onChange={(e) => setForm({ ...form, date_to: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Notiz" htmlFor="notes">
              <TextInput
                id="notes"
                title="Notiz"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional"
              />
            </FormField>

            <div className="md:col-span-2 xl:col-span-4">
              <AppButton type="submit">Beantragen</AppButton>
            </div>
          </form>
        </SectionCard>

        {/* Meine Abwesenheiten */}
        <SectionCard
          title="Meine Abwesenheiten"
          right={<Badge variant="slate">{myAbsences.length}</Badge>}
        >
          {loading ? (
            <div className="text-sm text-slate-500">Lade...</div>
          ) : myAbsences.length === 0 ? (
            <AlertBox variant="info">Keine Abwesenheiten vorhanden.</AlertBox>
          ) : (
            <div className="grid gap-3">
              {myAbsences.map((a) => {
                const typeInfo = getTypeInfo(a.type);
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-xl p-4 ring-1 ring-slate-200"
                    style={{ borderLeft: `4px solid ${typeInfo.color}`, backgroundColor: `${typeInfo.color}12` }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{typeInfo.label}</span>
                        <StatusBadge status={a.status} />
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {formatDate(a.date_from)} – {formatDate(a.date_to)} · {dayCount(a.date_from, a.date_to)} Tag(e)
                      </div>
                      {a.notes && <div className="mt-1 text-xs text-slate-500">{a.notes}</div>}
                    </div>
                    {a.status === "beantragt" && (
                      <AppButton
                        type="button"
                        variant="danger"
                        onClick={() => deleteAbsence(a.id, true)}
                        className="px-3 py-2 text-xs"
                      >
                        Löschen
                      </AppButton>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Admin-Bereich */}
        {isAdmin && (
          <>
            {/* Admin: Abwesenheit direkt eintragen */}
            <SectionCard title="Abwesenheit direkt eintragen (Admin)">
              <form onSubmit={submitAdminAbsence} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <FormField label="Mitarbeiter" htmlFor="admin_user">
                  <SelectInput
                    id="admin_user"
                    title="Mitarbeiter"
                    value={adminForm.user_id}
                    onChange={(e) => setAdminForm({ ...adminForm, user_id: e.target.value })}
                    required
                  >
                    {users
                      .sort((a, b) => displayUser(a).localeCompare(displayUser(b)))
                      .map((u) => (
                        <option key={u.id} value={u.id}>{displayUser(u)}</option>
                      ))}
                  </SelectInput>
                </FormField>

                <FormField label="Typ" htmlFor="admin_type">
                  <SelectInput
                    id="admin_type"
                    title="Typ"
                    value={adminForm.type}
                    onChange={(e) => setAdminForm({ ...adminForm, type: e.target.value })}
                  >
                    {ABSENCE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </SelectInput>
                </FormField>

                <FormField label="Von" htmlFor="admin_from">
                  <TextInput
                    id="admin_from"
                    title="Von"
                    type="date"
                    value={adminForm.date_from}
                    onChange={(e) => setAdminForm({ ...adminForm, date_from: e.target.value })}
                    required
                  />
                </FormField>

                <FormField label="Bis" htmlFor="admin_to">
                  <TextInput
                    id="admin_to"
                    title="Bis"
                    type="date"
                    value={adminForm.date_to}
                    onChange={(e) => setAdminForm({ ...adminForm, date_to: e.target.value })}
                    required
                  />
                </FormField>

                <FormField label="Notiz" htmlFor="admin_notes">
                  <TextInput
                    id="admin_notes"
                    title="Notiz"
                    value={adminForm.notes}
                    onChange={(e) => setAdminForm({ ...adminForm, notes: e.target.value })}
                    placeholder="Optional"
                  />
                </FormField>

                <div className="flex items-end">
                  <AppButton type="submit" className="w-full">Eintragen (sofort genehmigt)</AppButton>
                </div>
              </form>
            </SectionCard>

            {/* Admin: Alle Abwesenheiten */}
            <SectionCard
              title="Alle Abwesenheiten"
              right={
                <div className="flex items-center gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
                  >
                    <option value="alle">Alle</option>
                    <option value="beantragt">Beantragt</option>
                    <option value="genehmigt">Genehmigt</option>
                    <option value="abgelehnt">Abgelehnt</option>
                  </select>
                  <Badge variant="slate">{filteredAbsences.length}</Badge>
                </div>
              }
            >
              {filteredAbsences.length === 0 ? (
                <AlertBox variant="info">Keine Abwesenheiten gefunden.</AlertBox>
              ) : (
                <>
                  {/* Desktop Tabelle */}
                  <div className="hidden overflow-hidden rounded-xl ring-1 ring-slate-200 md:block">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Mitarbeiter</th>
                          <th className="px-4 py-3 font-semibold">Typ</th>
                          <th className="px-4 py-3 font-semibold">Von</th>
                          <th className="px-4 py-3 font-semibold">Bis</th>
                          <th className="px-4 py-3 font-semibold">Tage</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold">Aktionen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAbsences.map((a) => {
                          const typeInfo = getTypeInfo(a.type);
                          return (
                            <tr key={a.id} className="hover:bg-slate-50/60">
                              <td className="px-4 py-3 font-semibold text-slate-900">{a.user_name ?? "—"}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: typeInfo.color }} />
                                  <span className="text-slate-700">{typeInfo.label}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-700">{formatDate(a.date_from)}</td>
                              <td className="px-4 py-3 text-slate-700">{formatDate(a.date_to)}</td>
                              <td className="px-4 py-3 text-slate-700">{dayCount(a.date_from, a.date_to)}</td>
                              <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  {a.status === "beantragt" && (
                                    <>
                                      <AppButton
                                        type="button"
                                        onClick={() => updateStatus(a.id, "genehmigt")}
                                        className="px-3 py-1 text-xs"
                                      >
                                        Genehmigen
                                      </AppButton>
                                      <AppButton
                                        type="button"
                                        variant="danger"
                                        onClick={() => updateStatus(a.id, "abgelehnt")}
                                        className="px-3 py-1 text-xs"
                                      >
                                        Ablehnen
                                      </AppButton>
                                    </>
                                  )}
                                  <AppButton
                                    type="button"
                                    variant="secondary"
                                    onClick={() => deleteAbsence(a.id)}
                                    className="px-3 py-1 text-xs"
                                  >
                                    Löschen
                                  </AppButton>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="grid gap-3 md:hidden">
                    {filteredAbsences.map((a) => {
                      const typeInfo = getTypeInfo(a.type);
                      return (
                        <div
                          key={a.id}
                          className="rounded-xl p-4 ring-1 ring-slate-200"
                          style={{ borderLeft: `4px solid ${typeInfo.color}`, backgroundColor: `${typeInfo.color}12` }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-semibold text-slate-900">{a.user_name ?? "—"}</div>
                              <div className="text-sm text-slate-600">{typeInfo.label}</div>
                              <div className="mt-1 text-sm text-slate-600">
                                {formatDate(a.date_from)} – {formatDate(a.date_to)} · {dayCount(a.date_from, a.date_to)} Tag(e)
                              </div>
                            </div>
                            <StatusBadge status={a.status} />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {a.status === "beantragt" && (
                              <>
                                <AppButton type="button" onClick={() => updateStatus(a.id, "genehmigt")} className="px-3 py-1 text-xs">
                                  Genehmigen
                                </AppButton>
                                <AppButton type="button" variant="danger" onClick={() => updateStatus(a.id, "abgelehnt")} className="px-3 py-1 text-xs">
                                  Ablehnen
                                </AppButton>
                              </>
                            )}
                            <AppButton type="button" variant="secondary" onClick={() => deleteAbsence(a.id)} className="px-3 py-1 text-xs">
                              Löschen
                            </AppButton>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </SectionCard>
          </>
        )}

        <p className="text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} Workplan by Oswald-IT
        </p>
      </div>
    </PageContainer>
  );
}
