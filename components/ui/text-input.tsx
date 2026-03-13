"use client";

import React from "react";

type TextInputProps = {
  id: string;
  title?: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  className?: string;
};

export default function TextInput({
  id,
  title,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  min,
  max,
  step,
  className = "",
}: TextInputProps) {
  return (
    <input
      id={id}
      title={title}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      min={min}
      max={max}
      step={step}
      className={`w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100 ${className}`}
    />
  );
}