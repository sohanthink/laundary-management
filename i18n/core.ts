import { it } from "./it";

export type Locale = "en" | "it";
export const LOCALES: Locale[] = ["en", "it"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "lang";

export type Vars = Record<string, string | number>;
export type Translate = (key: string, vars?: Vars) => string;

function interpolate(text: string, vars?: Vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`));
}

/**
 * Keys are the English text itself, so untranslated strings simply show in English.
 * Use {name} placeholders for values: t("Due after {amount}", { amount }).
 */
export function createTranslator(locale: Locale): Translate {
  return (key, vars) => interpolate(locale === "it" ? (it[key] ?? key) : key, vars);
}

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "it";
}
