import { describe, expect, it } from "vitest";
import { computeBuckets, fifoOutstanding, totalOwned } from "./stock";

describe("computeBuckets", () => {
  it("follows pieces through the full cycle", () => {
    const b = computeBuckets([
      { fromState: "NONE", toState: "AVAILABLE", quantity: 200 },
      { fromState: "AVAILABLE", toState: "AT_HOTEL", quantity: 50 },
      { fromState: "AT_HOTEL", toState: "WASHING", quantity: 45 },
      { fromState: "WASHING", toState: "AVAILABLE", quantity: 30 },
      { fromState: "AT_HOTEL", toState: "WRITTEN_OFF", quantity: 2 },
    ]);
    expect(b).toEqual({ AVAILABLE: 180, AT_HOTEL: 3, WASHING: 15, WRITTEN_OFF: 2 });
    expect(totalOwned(b)).toBe(198);
    expect(totalOwned(b) + b.WRITTEN_OFF).toBe(200);
  });

  it("returns zeros for no movements", () => {
    expect(computeBuckets([])).toEqual({
      AVAILABLE: 0,
      AT_HOTEL: 0,
      WASHING: 0,
      WRITTEN_OFF: 0,
    });
  });
});

describe("fifoOutstanding", () => {
  const d = (day: number) => new Date(Date.UTC(2026, 0, day));

  it("matches returns against the oldest sends first", () => {
    const result = fifoOutstanding(
      [
        { date: d(10), quantity: 30 },
        { date: d(1), quantity: 50 },
      ],
      60,
    );
    expect(result).toEqual([{ date: d(10), quantity: 20 }]);
  });

  it("keeps everything when nothing came back", () => {
    expect(fifoOutstanding([{ date: d(1), quantity: 5 }], 0)).toEqual([
      { date: d(1), quantity: 5 },
    ]);
  });

  it("returns nothing when all came back", () => {
    expect(fifoOutstanding([{ date: d(1), quantity: 5 }], 5)).toEqual([]);
  });
});
