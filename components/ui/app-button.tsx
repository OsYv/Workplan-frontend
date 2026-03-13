"use client";

type Variant = "primary" | "secondary" | "danger";

export default function AppButton({
  children,
  type = "button",
  onClick,
  disabled,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  disabled?: boolean;
  variant?: Variant;
  className?: string;
}) {
  const styles =
    variant === "primary"
      ? "bg-green-700 text-white shadow-md shadow-green-700/20 hover:bg-green-800 focus:ring-green-200 disabled:bg-gray-400 disabled:shadow-none"
      : variant === "danger"
      ? "bg-red-600 text-white shadow-md shadow-red-600/20 hover:bg-red-700 focus:ring-red-200 disabled:bg-gray-400 disabled:shadow-none"
      : "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus:ring-slate-200";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-3 font-semibold transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed ${styles} ${className}`}
    >
      {children}
    </button>
  );
}