"use client";

import { useEffect, useSyncExternalStore } from "react";

// Unfinished Send / Collect lists are kept in this browser, per hotel, so staff
// can leave the screen and come back later. Old drafts are ignored.
const PREFIX = "annafi:draft:";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type DraftMode = "send" | "collect";

export function draftKey(mode: DraftMode, hotelId: string) {
  return `${PREFIX}${mode}:${hotelId}`;
}

export function loadDraft<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; data: T };
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function clearDraft(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // storage unavailable (private mode): nothing to clear
  }
}

/** Saves `data` while `keep` is true, removes the draft otherwise. */
export function useSaveDraft(key: string, data: unknown, keep: boolean, refresh?: unknown) {
  const json = JSON.stringify(data);
  useEffect(() => {
    try {
      if (keep) window.localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data: JSON.parse(json) }));
      else window.localStorage.removeItem(key);
    } catch {
      // storage full or unavailable: the list still works, it just isn't kept
    }
  }, [key, json, keep, refresh]);
}

const noopSubscribe = () => () => {};

/** False during server render and hydration, true afterwards. */
export function useIsClient() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/** Hotel ids that have an unfinished list for this mode (comma-joined for a stable snapshot). */
export function useDraftHotelIds(mode: DraftMode): Set<string> {
  const snapshot = useSyncExternalStore(
    subscribeStorage,
    () => {
      const ids: string[] = [];
      const prefix = `${PREFIX}${mode}:`;
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key?.startsWith(prefix) && loadDraft(key)) ids.push(key.slice(prefix.length));
      }
      return ids.sort().join(",");
    },
    () => "",
  );
  return new Set(snapshot ? snapshot.split(",") : []);
}

function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}
