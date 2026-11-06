"use client";

import type { ReactNode } from "react";
import { useIsClient } from "./draft";

/** Renders children only in the browser, so they can read saved drafts on first render. */
export function ClientOnly({ children }: { children: ReactNode }) {
  const isClient = useIsClient();
  if (!isClient) return <div className="min-h-[60vh] animate-pulse rounded-3xl bg-white/60" aria-busy="true" />;
  return <>{children}</>;
}
