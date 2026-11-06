"use client";

import type { ComponentProps, ReactNode } from "react";
import { useT } from "@/components/i18n-provider";
import { useFormState } from "./action-form";

export const inputClass =
  "h-12 w-full rounded-xl border border-(--line) bg-(--paper) px-3.5 text-base text-(--ink) outline-none transition placeholder:text-(--muted) focus:border-(--teal) focus:ring-4 focus:ring-(--teal-soft) disabled:opacity-60";

type FieldProps = {
  label: string;
  name: string;
  hint?: string;
  children: ReactNode;
  className?: string;
};

export function Field({ label, name, hint, children, className = "" }: FieldProps) {
  const t = useT();
  const state = useFormState();
  const error = state?.fieldErrors?.[name]?.[0];
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-(--ink)">{t(label)}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-sm text-red-600">{t(error)}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-(--muted)">{t(hint)}</span>
      ) : null}
    </label>
  );
}

export function Input({ className = "", placeholder, ...props }: ComponentProps<"input">) {
  const t = useT();
  return (
    <input
      className={`${inputClass} ${className}`}
      placeholder={placeholder ? t(placeholder) : undefined}
      {...props}
    />
  );
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea rows={3} className={`${inputClass} h-auto py-2.5 ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`${inputClass} pr-8 ${className}`} {...props} />;
}

/** <option> whose text is translated. */
export function Option({ children, ...props }: ComponentProps<"option"> & { children: string }) {
  const t = useT();
  return <option {...props}>{t(children)}</option>;
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
