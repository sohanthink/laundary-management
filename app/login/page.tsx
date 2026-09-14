import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center overflow-hidden bg-(--paper) px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(29,107,92,0.16),transparent_36%)]" />

      <main className="relative z-10 w-full max-w-md rounded-4xl border border-(--line) bg-white p-8 shadow-[0_24px_80px_rgba(20,38,31,0.08)] sm:p-10">
        <Logo compact />
        <h1 className="mt-8 font-display text-4xl tracking-tight text-(--ink)">
          Welcome back
        </h1>
        <p className="mt-2 text-(--muted)">
          Sign in to manage laundry orders and customers.
        </p>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-(--muted)">
          <Link href="/" className="font-medium text-(--teal) hover:underline">
            Back to home
          </Link>
        </p>
      </main>
    </div>
  );
}
