"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormState } from "./action-form";

export const inputClass =
  "h-11 w-full rounded-xl border border-(--line) bg-(--paper) px-3.5 text-sm text-(--ink) outline-none transition placeholder:text-(--muted) focus:border-(--teal) focus:ring-4 focus:ring-(--teal-soft) disabled:opacity-60";

type FieldProps = {
  label: string;
  name: string;
  hint?: string;
  children: ReactNode;
  className?: string;
};

export function Field({ label, name, hint, children, className = "" }: FieldProps) {
  const state = useFormState();
  const error = state?.fieldErrors?.[name]?.[0];
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-(--ink)">
        {label}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-(--muted)">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${inputClass} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      rows={3}
      className={`${inputClass} h-auto py-2.5 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`${inputClass} pr-8 ${className}`} {...props} />;
}

type TextFieldProps = ComponentProps<"input"> & {
  label: string;
  name: string;
  hint?: string;
};

export function TextField({ label, name, hint, className, ...props }: TextFieldProps) {
  return (
    <Field label={label} name={name} hint={hint} className={className}>
      <Input name={name} {...props} />
    </Field>
  );
}
