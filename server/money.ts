// Money is stored as integer poisha (100 poisha = 1 tk). Never use floats for totals.

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

export function isMoneyInput(value: string): boolean {
  return MONEY_PATTERN.test(value.trim());
}

/** "18.50" -> 1850, "20" -> 2000. Throws on invalid input. */
export function toPoisha(value: string | number): number {
  const text = String(value).trim();
  if (!MONEY_PATTERN.test(text)) {
    throw new Error(`Invalid money value: ${value}`);
  }
  const [whole, fraction = ""] = text.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/** 1850 -> "18.50" (for putting back into an input field). */
export function toTkInput(poisha: number): string {
  const sign = poisha < 0 ? "-" : "";
  const abs = Math.abs(poisha);
  const whole = Math.floor(abs / 100);
  const fraction = abs % 100;
  return fraction === 0
    ? `${sign}${whole}`
    : `${sign}${whole}.${String(fraction).padStart(2, "0")}`;
}

/** 185000 -> "1,850.00 tk" */
export function formatTk(poisha: number): string {
  const sign = poisha < 0 ? "-" : "";
  const abs = Math.abs(poisha);
  const whole = Math.floor(abs / 100).toLocaleString("en-US");
  const fraction = String(abs % 100).padStart(2, "0");
  return `${sign}${whole}.${fraction} tk`;
}

/** "10" or "2.5" percent -> basis points (1000, 250). */
export function percentToBasisPoints(value: string): number {
  return toPoisha(value);
}

export function basisPointsToPercent(bp: number): string {
  return toTkInput(bp);
}
