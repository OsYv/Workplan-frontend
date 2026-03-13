"use client";

export default function SectionCard({
  title,
  right,
  children,
  className = "",
}: {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-xl/30 ${className}`}
    >
      {title || right ? (
        <div className="flex items-center justify-between gap-3">
          {title ? (
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          ) : (
            <div />
          )}

          {right ? <div>{right}</div> : null}
        </div>
      ) : null}

      <div className={title || right ? "mt-5" : ""}>{children}</div>
    </div>
  );
}