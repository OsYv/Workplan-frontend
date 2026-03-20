"use client";

import { useEffect, useState } from "react";
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

type MeUser = {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  email: string;
  role: string | null;
  is_active: boolean;
};

type UserItem = {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  birth_date?: string | null;
  email: string;
  role: string;
  is_active: boolean;
  sort_order?: number;
};

function fullName(u: {
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  email?: string | null;
}) {
  const full = `${u.first_name?.trim() ?? ""} ${u.last_name?.trim() ?? ""}`.trim();
  return full || u.name?.trim() || u.email || "—";
}

function formatBirthDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("de-CH");
}

function toInputDate(dateStr?: string | null) {
  if (!dateStr) return "";
  return String(dateStr).slice(0, 10);
}

function RoleBadge({ role }: { role: string }) {
  if (role === "admin") return <Badge variant="orange">Admin</Badge>;
  return <Badge variant="slate">Mitarbeiter</Badge>;
}

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  birth_date: "",
  email: "",
  password: "",
  role: "employee",
  is_active: true,
};

export default function BenutzerPage() {
  const [forbidden, setForbidden] = useState(false);
  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  async function loadMe() {
    try {
      const user = await api.me();
      if (user?.role !== "admin") setForbidden(true);
    } catch {
      setForbidden(true);
    }
  }

  async function loadUsers() {
    setLoading(true);
    setMsg(null);
    try {
      const data = await api.users();
      const list = Array.isArray(data) ? data : [];
      setItems(list.sort((a: UserItem, b: UserItem) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Benutzer konnten nicht geladen werden" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  useEffect(() => {
    if (!forbidden) loadUsers();
  }, [forbidden]);

  async function moveUser(userId: number, direction: "up" | "down") {
    const idx = items.findIndex(u => u.id === userId);
    if (idx === -1) return;
    const newItems = [...items];
    if (direction === "up" && idx > 0) {
      [newItems[idx - 1], newItems[idx]] = [newItems[idx], newItems[idx - 1]];
    } else if (direction === "down" && idx < newItems.length - 1) {
      [newItems[idx], newItems[idx + 1]] = [newItems[idx + 1], newItems[idx]];
    } else return;

    setItems(newItems);
    setReordering(true);

    try {
      await api.reorderUsers(newItems.map(u => u.id));
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Reihenfolge konnte nicht gespeichert werden" });
      await loadUsers();
    } finally {
      setReordering(false);
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.createUser({
        first_name: form.first_name,
        last_name: form.last_name,
        birth_date: form.birth_date || null,
        email: form.email,
        password: form.password,
        role: form.role,
        is_active: form.is_active,
      });
      setMsg({ type: "ok", text: "✅ Benutzer erstellt" });
      setForm({ ...EMPTY_FORM });
      await loadUsers();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Benutzer konnte nicht erstellt werden" });
    }
  }

  function startEdit(user: UserItem) {
    setEditingUserId(user.id);
    setEditForm({
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      birth_date: toInputDate(user.birth_date),
      email: user.email,
      password: "",
      role: user.role,
      is_active: user.is_active,
    });
    setMsg(null);
  }

  function cancelEdit() {
    setEditingUserId(null);
    setEditForm({ ...EMPTY_FORM });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUserId) return;
    setSavingEdit(true);
    setMsg(null);
    try {
      await api.updateUser(editingUserId, {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        birth_date: editForm.birth_date || null,
        email: editForm.email,
        password: editForm.password || undefined,
        role: editForm.role,
        is_active: editForm.is_active,
      });
      setMsg({ type: "ok", text: "✅ Benutzer aktualisiert" });
      cancelEdit();
      await loadUsers();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Benutzer konnte nicht aktualisiert werden" });
    } finally {
      setSavingEdit(false);
    }
  }

  async function toggleActive(user: UserItem) {
    try {
      await api.updateUser(user.id, { is_active: !user.is_active });
      setMsg({ type: "ok", text: `✅ Benutzer ${!user.is_active ? "aktiviert" : "deaktiviert"}` });
      await loadUsers();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Benutzer konnte nicht aktualisiert werden" });
    }
  }

  async function deleteUser(user: UserItem) {
    const ok = window.confirm(`Benutzer "${fullName(user)}" wirklich löschen?`);
    if (!ok) return;
    setDeletingUserId(user.id);
    try {
      await api.deleteUser(user.id);
      setMsg({ type: "ok", text: "✅ Benutzer gelöscht" });
      if (editingUserId === user.id) cancelEdit();
      await loadUsers();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Benutzer konnte nicht gelöscht werden" });
    } finally {
      setDeletingUserId(null);
    }
  }

  if (forbidden) {
    return (
      <PageContainer>
        <SectionCard>
          <h1 className="text-xl font-bold text-slate-900">Benutzerverwaltung</h1>
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
          title="Benutzerverwaltung"
          subtitle="Benutzer anlegen, bearbeiten, Passwort setzen und löschen."
          actions={
            <AppButton type="button" variant="secondary" onClick={loadUsers} className="px-4 py-2 text-sm">
              Aktualisieren
            </AppButton>
          }
        />

        {/* Neuen Benutzer anlegen */}
        <SectionCard title="Neuen Benutzer anlegen">
          <form onSubmit={onCreate} className="grid gap-4 md:grid-cols-2">
            <FormField label="Vorname" htmlFor="first_name">
              <TextInput
                id="first_name"
                title="Vorname"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Nachname" htmlFor="last_name">
              <TextInput
                id="last_name"
                title="Nachname"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Geburtsdatum" htmlFor="birth_date">
              <TextInput
                id="birth_date"
                title="Geburtsdatum"
                type="date"
                value={form.birth_date}
                onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
              />
            </FormField>

            <FormField label="E-Mail" htmlFor="email">
              <TextInput
                id="email"
                title="E-Mail"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Passwort" htmlFor="password">
              <TextInput
                id="password"
                title="Passwort"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Rolle" htmlFor="role">
              <SelectInput
                id="role"
                title="Rolle"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="employee">Mitarbeiter</option>
                <option value="admin">Admin</option>
              </SelectInput>
            </FormField>

            <div className="md:col-span-2">
              <CheckboxInput
                id="is_active"
                title="Benutzer aktiv"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                label="Benutzer aktiv"
              />
            </div>

            <div className="md:col-span-2">
              <AppButton type="submit">Benutzer speichern</AppButton>
            </div>
          </form>
        </SectionCard>

        {msg && <AlertBox variant={msg.type}>{msg.text}</AlertBox>}

        {/* Benutzer bearbeiten (Inline) */}
        {editingUserId && (
          <SectionCard title="Benutzer bearbeiten">
            <form onSubmit={saveEdit} className="grid gap-4 md:grid-cols-2">
              <FormField label="Vorname" htmlFor="edit_first_name">
                <TextInput
                  id="edit_first_name"
                  title="Vorname"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  required
                />
              </FormField>

              <FormField label="Nachname" htmlFor="edit_last_name">
                <TextInput
                  id="edit_last_name"
                  title="Nachname"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  required
                />
              </FormField>

              <FormField label="Geburtsdatum" htmlFor="edit_birth_date">
                <TextInput
                  id="edit_birth_date"
                  title="Geburtsdatum"
                  type="date"
                  value={editForm.birth_date}
                  onChange={(e) => setEditForm({ ...editForm, birth_date: e.target.value })}
                />
              </FormField>

              <FormField label="E-Mail" htmlFor="edit_email">
                <TextInput
                  id="edit_email"
                  title="E-Mail"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                />
              </FormField>

              <FormField label="Neues Passwort" htmlFor="edit_password">
                <TextInput
                  id="edit_password"
                  title="Neues Passwort"
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Leer lassen, wenn unverändert"
                />
              </FormField>

              <FormField label="Rolle" htmlFor="edit_role">
                <SelectInput
                  id="edit_role"
                  title="Rolle"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                >
                  <option value="employee">Mitarbeiter</option>
                  <option value="admin">Admin</option>
                </SelectInput>
              </FormField>

              <div className="md:col-span-2">
                <CheckboxInput
                  id="edit_is_active"
                  title="Benutzer aktiv"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  label="Benutzer aktiv"
                />
              </div>

              <div className="md:col-span-2 flex gap-3">
                <AppButton type="submit" disabled={savingEdit}>
                  {savingEdit ? "Speichert..." : "Änderungen speichern"}
                </AppButton>
                <AppButton type="button" variant="secondary" onClick={cancelEdit}>
                  Abbrechen
                </AppButton>
              </div>
            </form>
          </SectionCard>
        )}

        {/* Benutzerliste */}
        <SectionCard
          title="Benutzer"
          right={
            loading ? <Badge variant="slate">Lade…</Badge> : <Badge variant="green">{items.length} Benutzer</Badge>
          }
        >
          {/* Desktop-Tabelle */}
          <div className="hidden overflow-hidden rounded-xl ring-1 ring-slate-200 md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Geburtsdatum</th>
                  <th className="px-4 py-3 font-semibold">E-Mail</th>
                  <th className="px-4 py-3 font-semibold">Rolle</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((u) => (
                  <tr
                    key={u.id}
                    className={`hover:bg-slate-50/60 ${editingUserId === u.id ? "bg-green-50/40" : ""}`}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {fullName(u)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatBirthDate(u.birth_date)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{u.email}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3">
                      {u.is_active ? (
                        <Badge variant="green">Aktiv</Badge>
                      ) : (
                        <Badge variant="red">Inaktiv</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <AppButton
                          type="button"
                          variant="secondary"
                          onClick={() => editingUserId === u.id ? cancelEdit() : startEdit(u)}
                          className="px-3 py-2 text-xs"
                        >
                          {editingUserId === u.id ? "Abbrechen" : "Bearbeiten"}
                        </AppButton>

                        <AppButton
                          type="button"
                          variant="secondary"
                          onClick={() => toggleActive(u)}
                          className="px-3 py-2 text-xs"
                        >
                          {u.is_active ? "Deaktivieren" : "Aktivieren"}
                        </AppButton>

                        <AppButton
                          type="button"
                          variant="danger"
                          onClick={() => deleteUser(u)}
                          disabled={deletingUserId === u.id}
                          className="px-3 py-2 text-xs"
                        >
                          {deletingUserId === u.id ? "Löscht..." : "Löschen"}
                        </AppButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile-Cards */}
          <div className="grid gap-3 md:hidden">
            {items.map((u) => (
              <div key={u.id} className="rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-slate-900">{fullName(u)}</div>
                  <RoleBadge role={u.role} />
                </div>
                <div className="mt-1 text-sm text-slate-600">{u.email}</div>
                <div className="mt-1 text-sm text-slate-600">
                  Geburtsdatum: {formatBirthDate(u.birth_date)}
                </div>
                <div className="mt-2">
                  {u.is_active ? (
                    <Badge variant="green">Aktiv</Badge>
                  ) : (
                    <Badge variant="red">Inaktiv</Badge>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <AppButton
                    type="button"
                    variant="secondary"
                    onClick={() => editingUserId === u.id ? cancelEdit() : startEdit(u)}
                    className="px-3 py-2 text-xs"
                  >
                    {editingUserId === u.id ? "Abbrechen" : "Bearbeiten"}
                  </AppButton>
                  <AppButton
                    type="button"
                    variant="secondary"
                    onClick={() => toggleActive(u)}
                    className="px-3 py-2 text-xs"
                  >
                    {u.is_active ? "Deaktivieren" : "Aktivieren"}
                  </AppButton>
                  <AppButton
                    type="button"
                    variant="danger"
                    onClick={() => deleteUser(u)}
                    disabled={deletingUserId === u.id}
                    className="px-3 py-2 text-xs"
                  >
                    {deletingUserId === u.id ? "Löscht..." : "Löschen"}
                  </AppButton>
                </div>
              </div>
            ))}
          </div>

          {!loading && items.length === 0 && (
            <AlertBox variant="info">Noch keine Benutzer vorhanden.</AlertBox>
          )}
        </SectionCard>

        <p className="text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} Workplan by Oswald-IT
        </p>
      </div>
    </PageContainer>
  );
}
