// Money is stored as integer cents (100 cents = 1 €). Never use floats for totals.

const MONEY_PATTERN = /^\d+([.,]\d{1,2})?$/;

/** Accepts "18", "18.5", "18,50". */
export function isMoneyInput(value: string): boolean {
  return MONEY_PATTERN.test(value.trim());
}

/** "18.50" or "18,50" -> 1850, "20" -> 2000. Throws on invalid input. */
export function toCents(value: string | number): number {
  const text = String(value).trim();
  if (!MONEY_PATTERN.test(text)) {
    throw new Error(`Invalid money value: ${value}`);
  }
  const [whole, fraction = ""] = text.replace(",", ".").split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/** 1850 -> "18.50" (for putting back into an input field). */
export function toMoneyInput(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const fraction = abs % 100;
  return fraction === 0
    ? `${sign}${whole}`
    : `${sign}${whole}.${String(fraction).padStart(2, "0")}`;
}

/** 185000 -> "1,850.00 €" */
export function formatMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = String(abs % 100).padStart(2, "0");
  return `${sign}${whole}.${fraction} €`;
}

/** "10" or "2.5" percent -> basis points (1000, 250). */
export function percentToBasisPoints(value: string): number {
  return toCents(value);
}

export function basisPointsToPercent(bp: number): string {
  return toMoneyInput(bp);
}
