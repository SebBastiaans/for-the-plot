import { describe, expect, it } from "vitest";
import { computeStats, isUpcoming, tripDays, type StatTrip } from "./stats";

const trip = (o: Partial<StatTrip>): StatTrip => ({
  id: "t", country_code: "FR", country_name: "France", start_date: "2025-06-01", end_date: "2025-06-05",
  stops: [], members: [], media: [], ...o,
});

describe("stats", () => {
  it("counts trip days inclusively", () => {
    expect(tripDays("2025-06-01", "2025-06-05")).toBe(5);
  });

  it("treats trips starting after today as upcoming, not visited", () => {
    expect(isUpcoming({ start_date: "2026-12-01" }, "2026-11-05")).toBe(true);
    const s = computeStats([trip({ start_date: "2026-12-01", end_date: "2026-12-03" })], {}, "2026-11-05");
    expect(s.totalCountries).toBe(0);
  });

  it("ranks friends by distinct countries visited", () => {
    const s = computeStats(
      [
        trip({ id: "1", country_code: "FR", members: ["a", "b"] }),
        trip({ id: "2", country_code: "IT", country_name: "Italy", members: ["a"] }),
        trip({ id: "3", country_code: "FR", members: ["a"] }),
      ],
      { a: "Anna", b: "Bas" },
      "2026-11-05",
    );
    expect(s.friendsByCountries[0]).toMatchObject({ key: "a", value: 2 });
    expect(s.friendsByCountries[1]).toMatchObject({ key: "b", value: 1 });
  });
});
