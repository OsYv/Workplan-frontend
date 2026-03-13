export function diffSecondsFrom(clockInIso?: string | null) {
  if (!clockInIso) return 0;

  const start = new Date(clockInIso).getTime();
  const now = Date.now();

  const diffMs = Math.max(0, now - start);

  return Math.floor(diffMs / 1000);
}

export function formatHHMMSS(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function formatLocal(iso?: string | null) {
  if (!iso) return "-";

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleString();
}

export function minutesBetween(aIso?: string | null, bIso?: string | null) {
  if (!aIso || !bIso) return 0;

  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();

  if (Number.isNaN(a) || Number.isNaN(b)) return 0;

  const diffMs = Math.max(0, b - a);

  return Math.floor(diffMs / 60000);
}

export function formatHM(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  return `${h}h ${String(m).padStart(2, "0")}m`;
}