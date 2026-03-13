"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import Badge from "@/components/ui/badge";
import { diffSecondsFrom, formatHHMMSS, formatLocal } from "@/lib/time";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import SectionCard from "@/components/ui/section-card";
import AppButton from "@/components/ui/app-button";
import AlertBox from "@/components/ui/alert-box";

type ClockState = {
  isClockedIn: boolean;
  clockInAt?: string | null;
  clockOutAt?: string | null;
  breakMinutesApplied?: number | null;
  status?: string | null;
  source?: string | null;
};

type MyShift = {
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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(dateIso?: string | null) {
  if (!dateIso) return "—";
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return dateIso;
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

function ShiftInfoCard({
  title,
  shift,
}: {
  title: string;
  shift: MyShift | null;
}) {
  return (
    <div
      className="rounded-xl p-4 shadow-sm ring-1 ring-slate-200"
      style={shiftCardStyle(shift?.shift_type_color)}
    >
      <div className="text-sm font-semibold text-slate-600">{title}</div>

      {shift ? (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <div
              className="h-4 w-4 rounded-full ring-1 ring-slate-200"
              style={{ backgroundColor: shift.shift_type_color || DEFAULT_COLOR }}
            />
            <div className="font-semibold text-slate-900">
              {shift.shift_type_name || "Schicht"}
            </div>
          </div>

          <div className="mt-2 text-sm text-slate-600">
            {formatDateLabel(shift.date)}
          </div>

          <div className="mt-1 text-sm text-slate-600">
            {shift.start_time} - {shift.end_time}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {shift.is_flexible ? (
              <Badge variant="orange">Flexibel</Badge>
            ) : (
              <Badge variant="slate">Fix</Badge>
            )}

            {shift.shift_type_counts_as_work === false ? (
              <Badge variant="red">Nicht anrechenbar</Badge>
            ) : (
              <Badge variant="green">Anrechenbar</Badge>
            )}
          </div>

          {shift.notes ? (
            <div className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-sm text-slate-600">
              {shift.notes}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 text-sm text-slate-500">Keine Schicht geplant</div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [state, setState] = useState<ClockState>({ isClockedIn: false });
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [myUpcomingShifts, setMyUpcomingShifts] = useState<MyShift[]>([]);

  async function loadStatus() {
    const s: any = await api.status();

    if (s?.is_clocked_in && s?.time_entry) {
      const te = s.time_entry;
      setState({
        isClockedIn: true,
        clockInAt: te.clock_in,
        clockOutAt: te.clock_out,
        breakMinutesApplied: te.break_minutes_applied ?? te.break_minutes ?? null,
        status: te.status ?? null,
        source: te.source ?? null,
      });
    } else {
      setState({ isClockedIn: false });
    }
  }

  async function loadMyUpcomingShifts() {
    const data = await api.myShifts(todayIso(), addDaysIso(14));
    const list = Array.isArray(data) ? data : [];

    list.sort((a: MyShift, b: MyShift) => {
      const aKey = `${a.date} ${a.start_time}`;
      const bKey = `${b.date} ${b.start_time}`;
      return aKey.localeCompare(bKey);
    });

    setMyUpcomingShifts(list);
  }

  useEffect(() => {
    loadStatus().catch((e: any) =>
      setMsg({ type: "err", text: e?.message ?? "Status konnte nicht geladen werden" })
    );

    loadMyUpcomingShifts().catch((e: any) =>
      setMsg({ type: "err", text: e?.message ?? "Schichten konnten nicht geladen werden" })
    );
  }, []);

  useEffect(() => {
    if (!state.isClockedIn || !state.clockInAt) {
      setElapsedSec(0);
      return;
    }

    setElapsedSec(diffSecondsFrom(state.clockInAt));
    const id = setInterval(() => {
      setElapsedSec(diffSecondsFrom(state.clockInAt));
    }, 1000);

    return () => clearInterval(id);
  }, [state.isClockedIn, state.clockInAt]);

  const canClockIn = useMemo(
    () => !loading && !state.isClockedIn,
    [loading, state.isClockedIn]
  );

  const canClockOut = useMemo(
    () => !loading && state.isClockedIn,
    [loading, state.isClockedIn]
  );

  const todaysShift =
    myUpcomingShifts.find((s) => s.date === todayIso()) ?? null;

  const nextShift =
    myUpcomingShifts.find((s) => s.date > todayIso()) ?? null;

  async function doClockIn() {
    setMsg(null);
    setLoading(true);
    try {
      await api.clockIn();
      await loadStatus();
      setMsg({ type: "ok", text: "✅ Eingestempelt" });
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Clock-in fehlgeschlagen" });
      await loadStatus().catch(() => {});
    } finally {
      setLoading(false);
    }
  }

  async function doClockOut() {
    setMsg(null);
    setLoading(true);
    try {
      await api.clockOut();
      await loadStatus();
      setMsg({ type: "ok", text: "✅ Ausgestempelt" });
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Clock-out fehlgeschlagen" });
      await loadStatus().catch(() => {});
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer>
      <div className="grid gap-6">
        <PageHeader
          title="Zeiterfassung"
          subtitle="Arbeitszeit erfassen und deine nächsten Schichten sehen."
        />

        <SectionCard title="Stempeln">
          <div className="grid gap-3">
            <AppButton type="button" onClick={doClockIn} disabled={!canClockIn}>
              {loading ? "Bitte warten..." : "Einstempeln"}
            </AppButton>

            <AppButton type="button" onClick={doClockOut} disabled={!canClockOut}>
              {loading ? "Bitte warten..." : "Ausstempeln"}
            </AppButton>
          </div>
        </SectionCard>

        <SectionCard title="Status">
          <div className="grid grid-cols-3 items-center gap-4">
            <div />
            <div className="flex justify-center">
              {state.isClockedIn ? (
                <Badge variant="green">EINGESTEMPELT</Badge>
              ) : (
                <Badge variant="orange">NICHT EINGESTEMPELT</Badge>
              )}
            </div>
            <div />
          </div>

          <div className="mt-5 rounded-2xl bg-gradient-to-b from-slate-50 to-white p-5 ring-1 ring-slate-200">
            <div className="flex items-center justify-center text-sm font-medium text-slate-600">
              Arbeitszeit
            </div>
            <div className="mt-2 flex items-center justify-center font-mono text-4xl font-extrabold tracking-tight text-slate-900">
              {state.isClockedIn ? formatHHMMSS(elapsedSec) : "00:00:00"}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {state.isClockedIn && state.breakMinutesApplied != null ? (
                <Badge variant="slate">
                  Pause: {state.breakMinutesApplied} min
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
            Eingestempelt um:{" "}
            <span className="font-semibold text-slate-900">
              {formatLocal(state.clockInAt)}
            </span>
          </div>
        </SectionCard>

        <SectionCard title="Meine Schichten">
          <div className="grid gap-4 md:grid-cols-2">
            <ShiftInfoCard title="Heute" shift={todaysShift} />
            <ShiftInfoCard title="Nächste Schicht" shift={nextShift} />
          </div>
        </SectionCard>

        {msg && <AlertBox variant={msg.type}>{msg.text}</AlertBox>}

        <p className="text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} Workplan by Oswald-IT
        </p>
      </div>
    </PageContainer>
  );
}