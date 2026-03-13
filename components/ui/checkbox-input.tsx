"use client";

import React from "react";

type CheckboxInputProps = {
  id: string;
  title?: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  className?: string;
};

export default function CheckboxInput({
  id,
  title,
  checked,
  onChange,
  label,
  className = "",
}: CheckboxInputProps) {
  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 ${className}`}
    >
      <input
        id={id}
        title={title}
        type="checkbox"
        checked={checked}
        onChange={onChange}
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}