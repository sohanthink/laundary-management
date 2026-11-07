// Walk-in customer (counter) rules. Pure functions, shared by server and screen.

export type CounterServiceType = "WASH_IRON" | "IRON_ONLY";

/** Iron only costs half of wash + iron (rounded to the cent). */
export function counterUnitPrice(washIronPrice: number, service: CounterServiceType): number {
  return service === "IRON_ONLY" ? Math.round(washIronPrice / 2) : washIronPrice;
}

/** "+39 333 123 4567" and "333-123-4567" are stored the same way: digits, optional leading +. */
export function normalizePhone(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

export function isValidPhone(value: string): boolean {
  const digits = normalizePhone(value).replace("+", "");
  return digits.length >= 6 && digits.length <= 15;
}
