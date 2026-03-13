"use client";

import React from "react";

type SelectInputProps = {
  id: string;
  title?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

export default function SelectInput({
  id,
  title,
  value,
  onChange,
  required,
  className = "",
  children,
}: SelectInputProps) {
  return (
    <select
      id={id}
      title={title}
      value={value}
      onChange={onChange}
      required={required}
      className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100 ${className}`}
    >
      {children}
    </select>
  );
}