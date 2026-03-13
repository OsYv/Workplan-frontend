"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import Badge from "@/components/ui/badge";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import SectionCard from "@/components/ui/section-card";
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

const DEFAULT_COLOR = "#2563eb";

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
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function shiftCardStyle(color?: string | null) {
  const c = color || DEFAULT_COLOR;
  return {
    borderLeft: `4px solid ${c}`,
    backgroundColor: `${c}12`,
    color: "#0f172a",
  } as React.CSSProperties;
}

export default function MeineSchichtenPage() {
  const [weekStart, setWeekStart] = useState(startOfWeekIso());
  const [items, setItems] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const weekEnd = weekDays[6];

  async function loadMyShifts() {
    setLoading(true);
    setMsg(null);

    try {
      const data = await api.myShifts(weekStart, weekEnd);
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setMsg(e?.message ?? "Schichten konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMyShifts();
  }, [weekStart]);

  function prevWeek() {
    setWeekStart(addDays(weekStart, -7));
  }

  function nextWeek() {
    setWeekStart(addDays(weekStart, 7));
  }

  function currentWeek() {
    setWeekStart(startOfWeekIso());
  }

  function shiftsFor(day: string) {
    return items
      .filter((s) => s.date === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  return (
    <PageContainer>
      <div className="grid gap-6">
        <PageHeader
          title="Meine Schichten"
          subtitle="Übersicht deiner geplanten Einsätze für die aktuelle Woche."
          actions={
            <>
              <AppButton type="button" variant="secondary" onClick={prevWeek} className="px-4 py-2 text-sm">
                ← Woche zurück
              </AppButton>
              <AppButton type="button" onClick={currentWeek} className="px-4 py-2 text-sm">
                Heute
              </AppButton>
              <AppButton type="button" variant="secondary" onClick={nextWeek} className="px-4 py-2 text-sm">
                Woche vor →
              </AppButton>
            </>
          }
        />

        {msg && <AlertBox variant="err">{msg}</AlertBox>}

        <div className="grid gap-4">
          {loading ? (
            <SectionCard>
              <div className="text-sm text-slate-500">Lade meine Schichten…</div>
            </SectionCard>
          ) : (
            weekDays.map((day) => {
              const dayItems = shiftsFor(day);

              return (
                <SectionCard
                  key={day}
                  title={formatDayHeader(day)}
                  right={
                    dayItems.length > 0 ? (
                      <Badge variant="green">{dayItems.length} Schicht(en)</Badge>
                    ) : (
                      <Badge variant="slate">Frei</Badge>
                    )
                  }
                >
                  {dayItems.length === 0 ? (
                    <AlertBox variant="info">
                      Keine Schicht geplant.
                    </AlertBox>
                  ) : (
                    <div className="grid gap-3">
                      {dayItems.map((s) => (
                        <div
                          key={s.id}
                          className="rounded-xl p-4 shadow-sm ring-1 ring-slate-200"
                          style={shiftCardStyle(s.shift_type_color)}
                        >
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-4 w-4 rounded-full ring-1 ring-slate-200"
                                  style={{
                                    backgroundColor: s.shift_type_color || DEFAULT_COLOR,
                                  }}
                                />
                                <div className="text-base font-bold">
                                  {s.shift_type_name || "Schicht"}
                                </div>
                              </div>

                              <div className="mt-1 text-sm">
                                {s.start_time} - {s.end_time}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {s.is_flexible ? (
                                <Badge variant="orange">Flexibel</Badge>
                              ) : (
                                <Badge variant="slate">Fix</Badge>
                              )}

                              {s.shift_type_counts_as_work === false ? (
                                <Badge variant="red">Nicht anrechenbar</Badge>
                              ) : (
                                <Badge variant="green">Anrechenbar</Badge>
                              )}
                            </div>
                          </div>

                          {s.notes ? (
                            <div className="mt-3 rounded-lg bg-white/60 px-3 py-2 text-sm">
                              {s.notes}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              );
            })
          )}
        </div>

        <p className="text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} Workplan by Oswald-IT
        </p>
      </div>
    </PageContainer>
  );
}