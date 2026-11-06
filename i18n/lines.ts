import type { Translate } from "./core";

// Notes stored in the database start with a fixed English prefix followed by data
// (product names, reasons, numbers). Only the prefix is translated.
const PREFIXES = ["Credit for rejected", "Send voided", "Invoice"];

export function translateLine(t: Translate, text: string): string {
  if (text.endsWith(" (washing)")) return `${text.slice(0, -" (washing)".length)} (${t("washing")})`;
  for (const prefix of PREFIXES) {
    if (text.startsWith(`${prefix}:`)) return `${t(prefix)}:${text.slice(prefix.length + 1)}`;
    if (text.startsWith(`${prefix} `) && /^\d+\/\d{4}$/.test(text.slice(prefix.length + 1))) {
      return `${t(prefix)} ${text.slice(prefix.length + 1)}`;
    }
  }
  return t(text);
}
