import Link from "next/link";
import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-(--paper)">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(29,107,92,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(196,165,116,0.16),transparent_28%)]" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <Link
          href="/login"
          className="inline-flex h-11 items-center rounded-full bg-(--teal) px-5 text-sm font-semibold text-white transition hover:bg-(--teal-dark)"
        >
          Sign in
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pb-20 pt-8">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.24em] text-(--teal)">
          Fresh clothes, calm operations
        </p>
        <h1 className="max-w-3xl font-display text-5xl leading-[1.05] tracking-tight text-(--ink) sm:text-7xl">
          Laundry management, made simple.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-(--muted)">
          an-nafi helps you track orders, customers, and deliveries from one
          clean workspace. Sign in to get started.
        </p>
        <div className="mt-10">
          <Link
            href="/login"
            className="inline-flex h-12 items-center rounded-full bg-(--ink) px-7 text-sm font-semibold text-white transition hover:bg-black"
          >
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
