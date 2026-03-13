"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { clearToken } from "@/lib/api";

type HeaderUser = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

function getInitials(label?: string | null) {
  if (!label) return "U";
  const base = label.includes("@") ? label.split("@")[0] : label;
  const parts = base.split(/[._\-\s]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function StatusBadge({
  variant,
  children,
}: {
  variant: "green" | "orange";
  children: React.ReactNode;
}) {
  const cls =
    variant === "green"
      ? "bg-green-50 text-green-800 ring-green-200"
      : "bg-orange-100 text-orange-800 ring-orange-200";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${cls}`}
    >
      {children}
    </span>
  );
}

function NavItem({
  href,
  active,
  children,
  onClick,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-2 pb-2 text-sm font-semibold transition ${
        active
          ? "border-white text-white"
          : "border-transparent text-white/80 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavItem({
  href,
  active,
  children,
  onClick,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
        active
          ? "bg-white text-green-800"
          : "bg-white/10 text-white hover:bg-white/15"
      }`}
    >
      {children}
    </Link>
  );
}

function UserMenu({
  user,
  onLogout,
}: {
  user?: HeaderUser | null;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const userLabel = user?.name?.trim() || user?.email || "User";
  const userSub = user?.role || user?.email || "—";

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-white hover:bg-white/15"
        aria-haspopup="menu"
        aria-expanded={open ? "true" : "false"}
      >
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-sm font-bold text-green-800">
          {getInitials(userLabel)}
        </div>

        <div className="hidden text-left sm:block">
          <div className="text-sm font-semibold">{userLabel}</div>
          <div className="text-xs text-white/70">{userSub}</div>
        </div>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-3 w-64 rounded-2xl border border-slate-200 bg-white shadow-xl"
          role="menu"
        >
          <div className="p-4">
            <div className="text-xs text-slate-500">Eingeloggt als</div>
            <div className="font-semibold text-slate-900">{userLabel}</div>
            <div className="text-xs text-slate-500">{user?.email}</div>
          </div>

          <div className="border-t" />

          <button
            type="button"
            className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50"
            onClick={onLogout}
            role="menuitem"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

function getPageTitle(pathname: string) {
  if (pathname === "/dashboard") return "Zeiterfassung";
  if (pathname === "/arbeitszeitkontrolle") return "Arbeitszeitkontrolle";
  if (pathname === "/dienstplan") return "Dienstplan";
  if (pathname === "/benutzer") return "Benutzer";
  if (pathname === "/schichtvorlagen") return "Schichtvorlagen";
  if (pathname === "/meine-schichten") return "Meine Schichten";
  return "Workplan";
}

export default function AppHeader({
  subtitle = "Workplan",
  isClockedIn,
  elapsedText,
  user,
}: {
  subtitle?: string;
  isClockedIn: boolean;
  elapsedText: string;
  user?: HeaderUser | null;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const title = useMemo(() => getPageTitle(pathname), [pathname]);
  const isAdmin = user?.role === "admin";

  const userLabel = user?.name?.trim() || user?.email || "User";
  const userSub = user?.role || user?.email || "—";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);

  function logout() {
    clearToken();
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-30 border-b border-green-800/40 bg-green-700">
      <div className="mx-auto max-w-6xl px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 rounded-xl bg-white p-1">
              <Image src="/logo.png" alt="Workplan" fill className="object-contain" />
            </div>

            <div>
              <div className="text-sm font-semibold text-white">{title}</div>
              <div className="text-xs text-white/80">{subtitle}</div>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {isClockedIn ? (
              <StatusBadge variant="green">LIVE</StatusBadge>
            ) : (
              <StatusBadge variant="orange">OFF</StatusBadge>
            )}

            <div className="font-mono text-sm font-semibold text-white">
              {elapsedText}
            </div>

            <UserMenu user={user} onLogout={logout} />
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 p-2 text-white hover:bg-white/15 md:hidden"
            aria-label={mobileOpen ? "Menü schliessen" : "Menü öffnen"}
            aria-expanded={mobileOpen ? "true" : "false"}
            aria-controls="mobile-navigation"
          >
            {mobileOpen ? (
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            ) : (
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 6h18" />
                <path d="M3 12h18" />
                <path d="M3 18h18" />
              </svg>
            )}
          </button>
        </div>

        <div className="mt-5 hidden flex-wrap items-center gap-6 md:flex">
          <NavItem href="/dashboard" active={pathname === "/dashboard"}>
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 12l9-9 9 9" />
              <path d="M9 21V9h6v12" />
            </svg>
            Zeiterfassung
          </NavItem>

          <NavItem
            href="/arbeitszeitkontrolle"
            active={pathname === "/arbeitszeitkontrolle"}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 6h10" />
              <path d="M9 12h10" />
              <path d="M9 18h10" />
              <path d="M5 6h.01" />
              <path d="M5 12h.01" />
              <path d="M5 18h.01" />
            </svg>
            Arbeitszeitkontrolle
          </NavItem>

          <NavItem
            href="/meine-schichten"
            active={pathname === "/meine-schichten"}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M8 2v4" />
              <path d="M16 2v4" />
              <path d="M3 10h18" />
            </svg>
            Meine Schichten
          </NavItem>

          {isAdmin ? (
            <>
              <NavItem href="/dienstplan" active={pathname === "/dienstplan"}>
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M8 2v4" />
                  <path d="M16 2v4" />
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M3 10h18" />
                </svg>
                Dienstplan
              </NavItem>

              <NavItem href="/benutzer" active={pathname === "/benutzer"}>
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 21a8 8 0 10-16 0" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Benutzer
              </NavItem>

              <NavItem
                href="/schichtvorlagen"
                active={pathname === "/schichtvorlagen"}
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 3v18" />
                  <path d="M3 12h18" />
                </svg>
                Schichtvorlagen
              </NavItem>
            </>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between md:hidden">
          {isClockedIn ? (
            <StatusBadge variant="green">LIVE</StatusBadge>
          ) : (
            <StatusBadge variant="orange">OFF</StatusBadge>
          )}

          <div className="font-mono text-sm text-white">{elapsedText}</div>
        </div>

        {mobileOpen && (
          <div
            id="mobile-navigation"
            className="mt-4 grid gap-3 border-t border-white/15 pt-4 md:hidden"
          >
            <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-sm font-bold text-green-800">
                  {getInitials(userLabel)}
                </div>
                <div>
                  <div className="text-sm font-semibold">{userLabel}</div>
                  <div className="text-xs text-white/70">{userSub}</div>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <MobileNavItem
                href="/dashboard"
                active={pathname === "/dashboard"}
                onClick={() => setMobileOpen(false)}
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 12l9-9 9 9" />
                  <path d="M9 21V9h6v12" />
                </svg>
                Zeiterfassung
              </MobileNavItem>

              <MobileNavItem
                href="/arbeitszeitkontrolle"
                active={pathname === "/arbeitszeitkontrolle"}
                onClick={() => setMobileOpen(false)}
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 6h10" />
                  <path d="M9 12h10" />
                  <path d="M9 18h10" />
                  <path d="M5 6h.01" />
                  <path d="M5 12h.01" />
                  <path d="M5 18h.01" />
                </svg>
                Arbeitszeitkontrolle
              </MobileNavItem>

              <MobileNavItem
                href="/meine-schichten"
                active={pathname === "/meine-schichten"}
                onClick={() => setMobileOpen(false)}
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M8 2v4" />
                  <path d="M16 2v4" />
                  <path d="M3 10h18" />
                </svg>
                Meine Schichten
              </MobileNavItem>

              {isAdmin ? (
                <>
                  <MobileNavItem
                    href="/dienstplan"
                    active={pathname === "/dienstplan"}
                    onClick={() => setMobileOpen(false)}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M8 2v4" />
                      <path d="M16 2v4" />
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M3 10h18" />
                    </svg>
                    Dienstplan
                  </MobileNavItem>

                  <MobileNavItem
                    href="/benutzer"
                    active={pathname === "/benutzer"}
                    onClick={() => setMobileOpen(false)}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M20 21a8 8 0 10-16 0" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Benutzer
                  </MobileNavItem>

                  <MobileNavItem
                    href="/schichtvorlagen"
                    active={pathname === "/schichtvorlagen"}
                    onClick={() => setMobileOpen(false)}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 3v18" />
                      <path d="M3 12h18" />
                    </svg>
                    Schichtvorlagen
                  </MobileNavItem>
                </>
              ) : null}
            </div>

            <button
              type="button"
              onClick={logout}
              className="rounded-xl bg-white px-4 py-3 text-left text-sm font-semibold text-red-600"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}