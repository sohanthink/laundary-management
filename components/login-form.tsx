"use client";

import { FormEvent } from "react";

export function LoginForm() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-(--ink)">
          Email
        </span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@annaafi.com"
          className="h-12 w-full rounded-xl border border-(--line) bg-(--paper) px-4 text-(--ink) outline-none transition placeholder:text-(--muted) focus:border-(--teal) focus:ring-4 focus:ring-(--teal-soft)"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-(--ink)">
          Password
        </span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          className="h-12 w-full rounded-xl border border-(--line) bg-(--paper) px-4 text-(--ink) outline-none transition placeholder:text-(--muted) focus:border-(--teal) focus:ring-4 focus:ring-(--teal-soft)"
        />
      </label>

      <button
        type="submit"
        className="flex h-12 w-full items-center justify-center rounded-full bg-(--teal) text-sm font-semibold text-white transition hover:bg-(--teal-dark)"
      >
        Sign in
      </button>
    </form>
  );
}
