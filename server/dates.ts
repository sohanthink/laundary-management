// All business dates are in Bangladesh time (UTC+6, no daylight saving).

const TIME_ZONE = "Asia/Dhaka";
const OFFSET = "+06:00";

/** "2026-01-31" -> Date at 00:00 Dhaka time */
export function startOfDhakaDay(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00${OFFSET}`);
}

/** "2026-01-31" -> Date at 00:00 Dhaka time on the following day (exclusive end) */
export function endOfDhakaDay(isoDate: string): Date {
  const start = startOfDhakaDay(isoDate);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

/** Date -> "2026-01-31" in Dhaka time */
export function toDhakaIsoDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function todayIso(): string {
  return toDhakaIsoDate(new Date());
}

export function startOfYear(year: number): Date {
  return startOfDhakaDay(`${year}-01-01`);
}

export function startOfMonth(date = new Date()): Date {
  const iso = toDhakaIsoDate(date);
  return startOfDhakaDay(`${iso.slice(0, 7)}-01`);
}

export function currentYear(): number {
  return Number(todayIso().slice(0, 4));
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Date range from ?from=&to= search params. Defaults to this year so far. */
export function rangeFromParams(from: unknown, to: unknown) {
  const today = todayIso();
  return {
    from: typeof from === "string" && ISO.test(from) ? from : `${today.slice(0, 4)}-01-01`,
    to: typeof to === "string" && ISO.test(to) ? to : today,
  };
}

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
