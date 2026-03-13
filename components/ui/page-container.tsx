"use client";

export default function PageContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="mx-auto max-w-6xl px-5 py-10">{children}</div>;
}