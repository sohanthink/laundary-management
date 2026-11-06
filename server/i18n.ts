import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { createTranslator, DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/core";

export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

/** Translator for Server Components and Server Actions. */
export async function getT() {
  return createTranslator(await getLocale());
}

/** Translates plain strings; leaves elements and numbers untouched. */
export async function translateNode<T>(node: T): Promise<T> {
  if (typeof node !== "string") return node;
  return (await getT())(node) as T;
}
