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
import CheckboxInput from "@/components/ui/checkbox-input";

type MeUser = {
  id: number;
  email: string;
  role: string | null;
  is_active: boolean;
};

type ShiftTypeItem = {
  id: number;
  name: string;
  break_minutes_default: number;
  fixed_start_time?: string | null;
  fixed_end_time?: string | null;
  color?: string | null;
  counts_as_work: boolean;
  is_flexible_default: boolean;
};

const DEFAULT_COLOR = "#2563eb";

export default function SchichtvorlagenPage() {
  const [forbidden, setForbidden] = useState(false);
  const [items, setItems] = useState<ShiftTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: "",
    break_minutes_default: 0,
    fixed_start_time: "",
    fixed_end_time: "",
    color: DEFAULT_COLOR,
    counts_as_work: true,
    is_flexible_default: false,
  });

  async function loadMe() {
    try {
      const me: MeUser = await api.me();
      if (me?.role !== "admin") setForbidden(true);
    } catch {
      setForbidden(true);
    }
  }

  async function loadShiftTypes() {
    setLoading(true);
    setMsg(null);

    try {
      const data = await api.shiftTypes();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setMsg({
        type: "err",
        text: e?.message ?? "Schichtvorlagen konnten nicht geladen werden",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
    loadShiftTypes();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    try {
      await api.createShiftType({
        name: form.name,
        break_minutes_default: Number(form.break_minutes_default),
        fixed_start_time: form.fixed_start_time || null,
        fixed_end_time: form.fixed_end_time || null,
        color: form.color || DEFAULT_COLOR,
        counts_as_work: form.counts_as_work,
        is_flexible_default: form.is_flexible_default,
      });

      setMsg({ type: "ok", text: "✅ Schichtvorlage erstellt" });

      setForm({
        name: "",
        break_minutes_default: 0,
        fixed_start_time: "",
        fixed_end_time: "",
        color: DEFAULT_COLOR,
        counts_as_work: true,
        is_flexible_default: false,
      });

      await loadShiftTypes();
    } catch (e: any) {
      setMsg({
        type: "err",
        text: e?.message ?? "Schichtvorlage konnte nicht erstellt werden",
      });
    }
  }

  function startEdit(item: ShiftTypeItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      break_minutes_default: item.break_minutes_default,
      fixed_start_time: item.fixed_start_time || "",
      fixed_end_time: item.fixed_end_time || "",
      color: item.color || DEFAULT_COLOR,
      counts_as_work: item.counts_as_work,
      is_flexible_default: item.is_flexible_default,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({
      name: "",
      break_minutes_default: 0,
      fixed_start_time: "",
      fixed_end_time: "",
      color: DEFAULT_COLOR,
      counts_as_work: true,
      is_flexible_default: false,
    });
  }

  async function onUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;

    setMsg(null);

    try {
      await api.updateShiftType(editingId, {
        name: form.name,
        break_minutes_default: Number(form.break_minutes_default),
        fixed_start_time: form.fixed_start_time || null,
        fixed_end_time: form.fixed_end_time || null,
        color: form.color || DEFAULT_COLOR,
        counts_as_work: form.counts_as_work,
        is_flexible_default: form.is_flexible_default,
      });

      setMsg({ type: "ok", text: "✅ Schichtvorlage aktualisiert" });
      cancelEdit();
      await loadShiftTypes();
    } catch (e: any) {
      setMsg({
        type: "err",
        text: e?.message ?? "Schichtvorlage konnte nicht aktualisiert werden",
      });
    }
  }

  async function onDelete(id: number) {
    const ok = window.confirm("Schichtvorlage wirklich löschen?");
    if (!ok) return;

    try {
      await api.deleteShiftType(id);
      setMsg({ type: "ok", text: "✅ Schichtvorlage gelöscht" });

      if (editingId === id) {
        cancelEdit();
      }

      await loadShiftTypes();
    } catch (e: any) {
      setMsg({
        type: "err",
        text: e?.message ?? "Schichtvorlage konnte nicht gelöscht werden",
      });
    }
  }

  if (forbidden) {
    return (
      <PageContainer>
        <SectionCard>
          <h1 className="text-xl font-bold text-slate-900">Schichtvorlagen</h1>
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
          title="Schichtvorlagen"
          subtitle="Schichttypen, Standardpausen, fixe Zeiten, Farben und Regeln verwalten."
        />

        <SectionCard
          title={editingId ? "Schichtvorlage bearbeiten" : "Neue Schichtvorlage"}
        >
          <form
            onSubmit={editingId ? onUpdate : onCreate}
            className="grid gap-4 md:grid-cols-2"
          >
            <FormField label="Name" htmlFor="name">
              <TextInput
                id="name"
                title="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </FormField>

            <FormField
              label="Standardpause (Minuten)"
              htmlFor="break_minutes_default"
            >
              <TextInput
                id="break_minutes_default"
                title="Standardpause"
                type="number"
                min={0}
                value={form.break_minutes_default}
                onChange={(e) =>
                  setForm({
                    ...form,
                    break_minutes_default: Number(e.target.value),
                  })
                }
                required
              />
            </FormField>

            <FormField label="Feste Startzeit" htmlFor="fixed_start_time">
              <TextInput
                id="fixed_start_time"
                title="Feste Startzeit"
                type="time"
                value={form.fixed_start_time}
                onChange={(e) =>
                  setForm({ ...form, fixed_start_time: e.target.value })
                }
              />
            </FormField>

            <FormField label="Feste Endzeit" htmlFor="fixed_end_time">
              <TextInput
                id="fixed_end_time"
                title="Feste Endzeit"
                type="time"
                value={form.fixed_end_time}
                onChange={(e) =>
                  setForm({ ...form, fixed_end_time: e.target.value })
                }
              />
            </FormField>

            <FormField label="Farbe" htmlFor="color">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <input
                  id="color"
                  title="Farbe"
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="h-10 w-14 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <div
                  className="h-8 w-8 rounded-full ring-1 ring-slate-200"
                  style={{ backgroundColor: form.color }}
                />
                <span className="text-sm font-semibold text-slate-700">
                  {form.color}
                </span>
              </div>
            </FormField>

            <div className="space-y-3">
              <CheckboxInput
                id="counts_as_work"
                title="Stunden zählen"
                checked={form.counts_as_work}
                onChange={(e) =>
                  setForm({ ...form, counts_as_work: e.target.checked })
                }
                label="Stunden werden gezählt"
              />

              <CheckboxInput
                id="is_flexible_default"
                title="Flexibel"
                checked={form.is_flexible_default}
                onChange={(e) =>
                  setForm({
                    ...form,
                    is_flexible_default: e.target.checked,
                  })
                }
                label="Flexibel"
              />
            </div>

            <div className="md:col-span-2 flex gap-3">
              <AppButton type="submit">
                {editingId ? "Änderungen speichern" : "Schichtvorlage speichern"}
              </AppButton>

              {editingId ? (
                <AppButton type="button" variant="secondary" onClick={cancelEdit}>
                  Abbrechen
                </AppButton>
              ) : null}
            </div>
          </form>
        </SectionCard>

        {msg && <AlertBox variant={msg.type}>{msg.text}</AlertBox>}

        <SectionCard
          title="Vorlagen"
          right={
            loading ? <Badge variant="slate">Lade…</Badge> : <Badge variant="green">OK</Badge>
          }
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((st) => (
              <div
                key={st.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-5 w-5 rounded-full ring-1 ring-slate-200"
                      style={{ backgroundColor: st.color || DEFAULT_COLOR }}
                    />
                    <div className="font-semibold text-slate-900">{st.name}</div>
                  </div>
                </div>

                <div className="mt-3 text-sm text-slate-600">
                  Standardpause: {st.break_minutes_default} min
                </div>

                <div className="mt-1 text-sm text-slate-600">
                  Zeit:{" "}
                  {st.fixed_start_time && st.fixed_end_time
                    ? `${st.fixed_start_time} - ${st.fixed_end_time}`
                    : "keine fixe Zeit"}
                </div>

                <div className="mt-1 text-sm text-slate-600">
                  Farbe: {st.color || DEFAULT_COLOR}
                </div>

                <div className="mt-1 text-sm text-slate-600">
                  Stunden zählen: {st.counts_as_work ? "Ja" : "Nein"}
                </div>

                <div className="mt-1 text-sm text-slate-600">
                  Flexibel: {st.is_flexible_default ? "Ja" : "Nein"}
                </div>

                <div className="mt-4 flex gap-2">
                  <AppButton
                    type="button"
                    variant="secondary"
                    onClick={() => startEdit(st)}
                    className="px-3 py-2 text-xs"
                  >
                    Bearbeiten
                  </AppButton>

                  <AppButton
                    type="button"
                    variant="danger"
                    onClick={() => onDelete(st.id)}
                    className="px-3 py-2 text-xs"
                  >
                    Löschen
                  </AppButton>
                </div>
              </div>
            ))}
          </div>

          {!loading && items.length === 0 && (
            <AlertBox variant="info">
              Noch keine Schichtvorlagen vorhanden.
            </AlertBox>
          )}
        </SectionCard>
      </div>
    </PageContainer>
  );
}