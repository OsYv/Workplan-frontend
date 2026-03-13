"use client";

type AlertVariant = "ok" | "err" | "info" | "warn";

export default function AlertBox({
  variant = "info",
  children,
  className = "",
}: {
  variant?: AlertVariant;
  children: React.ReactNode;
  className?: string;
}) {
  const styles =
    variant === "ok"
      ? "border-green-200 bg-green-50 text-green-800"
      : variant === "err"
      ? "border-red-200 bg-red-50 text-red-800"
      : variant === "warn"
      ? "border-orange-200 bg-orange-50 text-orange-800"
      : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${styles} ${className}`}
    >
      {children}
    </div>
  );
}