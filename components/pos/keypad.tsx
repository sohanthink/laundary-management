"use client";

import { Delete } from "lucide-react";
import { useT } from "@/components/i18n-provider";

const KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3"];

/** Big number pad for quantities, prices and phone numbers.
 * Calls onKey with "0"-"9", "." (or "+" when pointKey is "+"), "back" or "clear". */
export function Keypad({
  onKey,
  allowDecimal = false,
  disabled = false,
  pointKey = ".",
}: {
  onKey: (key: string) => void;
  allowDecimal?: boolean;
  disabled?: boolean;
  pointKey?: "." | "+";
}) {
  const t = useT();
  const keyClass =
    "flex h-14 items-center justify-center rounded-xl border-2 border-(--line) bg-white text-2xl font-semibold text-(--ink) transition hover:border-(--teal) active:scale-95 disabled:opacity-40";
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label={t("Number pad")}>
      {KEYS.map((k) => (
        <button key={k} type="button" className={keyClass} disabled={disabled} onClick={() => onKey(k)}>
          {k}
        </button>
      ))}
      <button
        type="button"
        className={keyClass}
        disabled={disabled || (pointKey === "." && !allowDecimal)}
        onClick={() => onKey(pointKey)}
        aria-label={t(pointKey === "+" ? "Plus sign" : "Decimal point")}
      >
        {pointKey}
      </button>
      <button type="button" className={keyClass} disabled={disabled} onClick={() => onKey("0")}>
        0
      </button>
      <button
        type="button"
        className={keyClass}
        disabled={disabled}
        onClick={() => onKey("back")}
        aria-label={t("Delete last digit")}
      >
        <Delete className="size-7" aria-hidden />
      </button>
      <button
        type="button"
        className={`${keyClass} col-span-3 text-base`}
        disabled={disabled}
        onClick={() => onKey("clear")}
      >
        {t("Clear")}
      </button>
    </div>
  );
}

/** Applies a keypad key to the current text value. */
export function applyKey(current: string, key: string, allowDecimal: boolean) {
  if (key === "clear") return "";
  if (key === "back") return current.slice(0, -1);
  if (key === ".") {
    if (!allowDecimal || current.includes(".")) return current;
    return current === "" ? "0." : `${current}.`;
  }
  const next = current === "0" ? key : current + key;
  if (allowDecimal) {
    const [, decimals = ""] = next.split(".");
    if (decimals.length > 2) return current;
  }
  return next.length > 7 ? current : next;
}
