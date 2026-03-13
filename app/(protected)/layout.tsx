"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AppHeader from "@/components/app-header";
import { api } from "@/lib/api";
import { diffSecondsFrom, formatHHMMSS } from "@/lib/time";
import { canAccessPath } from "@/lib/auth";

type MeUser = {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  email: string;
  role?: string | null;
  is_active: boolean;
};

type ClockState = {
  isClockedIn: boolean;
  clockInAt?: string | null;
  clockOutAt?: string | null;
  breakMinutesApplied?: number | null;
  status?: string | null;
  source?: string | null;
};

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<MeUser | null>(null);
  const [clockState, setClockState] = useState<ClockState>({
    isClockedIn: false,
  });
  const [elapsedSec, setElapsedSec] = useState(0);
  const [ready, setReady] = useState(false);

  async function loadUser() {
    try {
      const me = await api.me();
      setUser(me);
      return me as MeUser;
    } catch {
      setUser(null);
      return null;
    }
  }

  async function loadStatus() {
    try {
      const s: any = await api.status();

      if (s?.is_clocked_in && s?.time_entry) {
        const te = s.time_entry;
        setClockState({
          isClockedIn: true,
          clockInAt: te.clock_in,
          clockOutAt: te.clock_out,
          breakMinutesApplied:
            te.break_minutes_applied ?? te.break_minutes ?? null,
          status: te.status ?? null,
          source: te.source ?? null,
        });
      } else {
        setClockState({ isClockedIn: false });
      }
    } catch {
      setClockState({ isClockedIn: false });
    }
  }

  useEffect(() => {
    let active = true;

    async function init() {
      const me = await loadUser();
      await loadStatus();

      if (!active) return;

      if (!me) {
        router.replace("/");
        return;
      }

      if (!canAccessPath(pathname, me.role)) {
        router.replace("/dashboard");
        return;
      }

      setReady(true);
    }

    init();

    return () => {
      active = false;
    };
  }, [pathname, router]);

  useEffect(() => {
    if (!clockState.isClockedIn || !clockState.clockInAt) {
      setElapsedSec(0);
      return;
    }

    setElapsedSec(diffSecondsFrom(clockState.clockInAt));

    const id = setInterval(() => {
      setElapsedSec(diffSecondsFrom(clockState.clockInAt));
    }, 1000);

    return () => clearInterval(id);
  }, [clockState.isClockedIn, clockState.clockInAt]);

  const elapsedText = useMemo(() => {
    return clockState.isClockedIn ? formatHHMMSS(elapsedSec) : "00:00:00";
  }, [clockState.isClockedIn, elapsedSec]);

  const headerUser = useMemo(() => {
    if (!user) return null;

    const fullName =
      `${user.first_name?.trim() ?? ""} ${user.last_name?.trim() ?? ""}`.trim();

    return {
      name: fullName || user.name || user.email,
      email: user.email,
      role: user.role ?? null,
    };
  }, [user]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-xl/30">
            Lade…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <AppHeader
        isClockedIn={clockState.isClockedIn}
        elapsedText={elapsedText}
        user={headerUser}
      />

      <main>{children}</main>
    </div>
  );
}