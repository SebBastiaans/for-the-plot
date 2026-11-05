import { describe, expect, it } from "vitest";
import { computeStats, isUpcoming, stopDatesError, tripDays, type StatTrip } from "./stats";

const trip = (o: Partial<StatTrip>): StatTrip => ({
  id: "t", countries: [{ code: "FR", name: "France" }], start_date: "2025-06-01", end_date: "2025-06-05",
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
        trip({ id: "1", members: ["a", "b"] }),
        trip({ id: "2", countries: [{ code: "IT", name: "Italy" }], members: ["a"] }),
        trip({ id: "3", members: ["a"] }),
      ],
      { a: "Anna", b: "Bas" },
      "2026-11-05",
    );
    expect(s.friendsByCountries[0]).toMatchObject({ key: "a", value: 2 });
    expect(s.friendsByCountries[1]).toMatchObject({ key: "b", value: 1 });
  });

  it("counts a multi-country trip for every country it includes", () => {
    const s = computeStats(
      [trip({ countries: [{ code: "FR", name: "France" }, { code: "JP", name: "Japan" }], members: ["a"] })],
      { a: "Anna" },
      "2026-11-05",
    );
    expect(s.totalCountries).toBe(2);
    expect(s.totalContinents).toBe(2);
    expect(s.friendsByCountries[0]).toMatchObject({ key: "a", value: 2 });
  });

  it("requires stop dates to fall inside the trip", () => {
    const t = { start_date: "2025-06-01", end_date: "2025-06-10" };
    expect(stopDatesError(t, {})).toBeNull();
    expect(stopDatesError(t, { arrived_on: "2025-06-02", left_on: "2025-06-04" })).toBeNull();
    expect(stopDatesError(t, { arrived_on: "2025-05-30" })).not.toBeNull();
    expect(stopDatesError(t, { left_on: "2025-06-11" })).not.toBeNull();
    expect(stopDatesError(t, { arrived_on: "2025-06-05", left_on: "2025-06-03" })).not.toBeNull();
  });
});

import { qualifiesForGroup } from "./stats";
describe("qualifiesForGroup", () => {
  it("'all' needs every member", () => {
    expect(qualifiesForGroup({ rule_type: "all", rule_value: 100 }, 9, 10)).toBe(false);
    expect(qualifiesForGroup({ rule_type: "all", rule_value: 100 }, 10, 10)).toBe(true);
  });
  it("8 out of 10", () => {
    expect(qualifiesForGroup({ rule_type: "count", rule_value: 8 }, 7, 10)).toBe(false);
    expect(qualifiesForGroup({ rule_type: "count", rule_value: 8 }, 8, 10)).toBe(true);
  });
  it("at least 60%", () => {
    expect(qualifiesForGroup({ rule_type: "percent", rule_value: 60 }, 5, 10)).toBe(false);
    expect(qualifiesForGroup({ rule_type: "percent", rule_value: 60 }, 6, 10)).toBe(true);
  });
});
