"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { useT } from "@/components/i18n-provider";
import { login } from "@/server/modules/auth/actions";

const inputClass =
  "h-12 w-full rounded-xl border border-(--line) bg-(--paper) px-4 text-(--ink) outline-none transition placeholder:text-(--muted) focus:border-(--teal) focus:ring-4 focus:ring-(--teal-soft)";

export function LoginForm() {
  const t = useT();
  const [state, action, pending] = useActionState(login, undefined);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="mt-8 space-y-5">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-(--ink)">
          {t("Email")}
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@annaafi.com"
          className={inputClass}
        />
        {state?.fieldErrors?.email && (
          <span className="mt-1 block text-xs text-red-600">
            {t(state.fieldErrors.email[0])}
          </span>
        )}
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-(--ink)">
          {t("Password")}
        </span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder={t("Enter your password")}
          className={inputClass}
        />
        {state?.fieldErrors?.password && (
          <span className="mt-1 block text-xs text-red-600">
            {t(state.fieldErrors.password[0])}
          </span>
        )}
      </label>

      {state?.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {t(state.error)}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full items-center justify-center rounded-full bg-(--teal) text-sm font-semibold text-white transition hover:bg-(--teal-dark) disabled:opacity-60"
      >
        {pending ? t("Signing in...") : t("Sign in")}
      </button>
    </form>
  );
}
