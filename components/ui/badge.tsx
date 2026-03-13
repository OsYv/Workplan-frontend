"use client";

export default function Badge({
  variant = "slate",
  children,
}: {
  variant?: "green" | "red" | "orange" | "slate";
  children: React.ReactNode;
}) {
  const cls =
    variant === "green"
      ? "bg-green-50 text-green-800 ring-green-200"
      : variant === "red"
      ? "bg-red-50 text-red-800 ring-red-200"
      : variant === "orange"
      ? "bg-orange-100 text-orange-800 ring-orange-200"
      : "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${cls}`}
    >
      {children}
    </span>
  );
}