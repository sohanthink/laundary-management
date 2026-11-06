// All business dates are in Italian time (Europe/Rome, with summer time).

export const TIME_ZONE = "Europe/Rome";

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** How far Rome's clock is ahead of UTC at this instant, in ms. */
function zoneOffsetMs(date: Date): number {
  const p = Object.fromEntries(partsFormatter.formatToParts(date).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** "2026-01-31" -> Date at 00:00 Rome time */
export function startOfLocalDay(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  let result = guess - zoneOffsetMs(new Date(guess));
  const corrected = guess - zoneOffsetMs(new Date(result));
  if (corrected !== result) result = corrected;
  return new Date(result);
}

function nextIsoDay(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** "2026-01-31" -> Date at 00:00 Rome time on the following day (exclusive end) */
export function endOfLocalDay(isoDate: string): Date {
  return startOfLocalDay(nextIsoDay(isoDate));
}

/** Date -> "2026-01-31" in Rome time */
export function toLocalIsoDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function todayIso(): string {
  return toLocalIsoDate(new Date());
}

export function startOfYear(year: number): Date {
  return startOfLocalDay(`${year}-01-01`);
}

export function startOfMonth(date = new Date()): Date {
  const iso = toLocalIsoDate(date);
  return startOfLocalDay(`${iso.slice(0, 7)}-01`);
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

/** 04/11/2026 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** 04/11/2026 14:39 */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(date)
    .replace(",", "");
}
