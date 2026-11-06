import { describe, expect, it } from "vitest";
import { endOfLocalDay, formatDate, startOfLocalDay, toLocalIsoDate } from "./dates";

describe("Rome dates", () => {
  it("uses UTC+1 in winter", () => {
    expect(startOfLocalDay("2026-01-15").toISOString()).toBe("2026-01-14T23:00:00.000Z");
  });

  it("uses UTC+2 in summer", () => {
    expect(startOfLocalDay("2026-07-15").toISOString()).toBe("2026-07-14T22:00:00.000Z");
  });

  it("handles the day the clocks change", () => {
    // 29 March 2026: clocks go forward, so the day is 23 hours long.
    const start = startOfLocalDay("2026-03-29");
    const end = endOfLocalDay("2026-03-29");
    expect(start.toISOString()).toBe("2026-03-28T23:00:00.000Z");
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(23);
  });

  it("converts back to the Rome calendar date", () => {
    expect(toLocalIsoDate(new Date("2026-07-14T22:30:00Z"))).toBe("2026-07-15");
    expect(formatDate(new Date("2026-11-04T10:00:00Z"))).toBe("04/11/2026");
  });
});
