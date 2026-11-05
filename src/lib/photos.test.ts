import { describe, expect, it } from "vitest";
import { clusterByDays, matchStop, matchTrip } from "./photos";
import { defaultArrival } from "./stats";

const stops = [
  { id: "a", lat: 52.37, lng: 4.9, arrived_on: "2026-07-01", left_on: "2026-07-03" },
  { id: "b", lat: 48.85, lng: 2.35, arrived_on: "2026-07-03", left_on: "2026-07-06" },
];

describe("photo sorting", () => {
  it("matches a photo to the nearest place by location", () => {
    expect(matchStop(stops, { takenAt: null, lat: 48.86, lng: 2.34 })).toBe("b");
  });
  it("falls back to the place whose days cover the photo", () => {
    expect(matchStop(stops, { takenAt: "2026-07-05T10:00:00Z", lat: null, lng: null })).toBe("b");
  });
  it("matches a photo to the trip containing its day", () => {
    const trips = [{ id: "t", start_date: "2026-07-01", end_date: "2026-07-06", trip_stops: stops }];
    expect(matchTrip(trips, { takenAt: "2026-07-06T22:00:00Z", lat: null, lng: null })?.id).toBe("t");
    expect(matchTrip(trips, { takenAt: "2026-07-08T10:00:00Z", lat: null, lng: null })).toBeNull();
  });
  it("groups photos into suggested trips split by gaps over 2 days", () => {
    const m = (d: string) => ({ meta: { takenAt: d + "T12:00:00Z", lat: null, lng: null } });
    const c = clusterByDays([m("2026-08-01"), m("2026-08-03"), m("2026-08-10")]);
    expect(c.map((x) => [x.start, x.end])).toEqual([["2026-08-01", "2026-08-03"], ["2026-08-10", "2026-08-10"]]);
  });
});

describe("defaultArrival", () => {
  it("uses the trip start for the first place", () => {
    expect(defaultArrival("2026-07-01", "2026-07-06", null, true)).toBe("2026-07-01");
  });
  it("uses the previous place's last day", () => {
    expect(defaultArrival("2026-07-01", "2026-07-06", "2026-07-03", false)).toBe("2026-07-03");
  });
  it("leaves it empty without trip dates", () => {
    expect(defaultArrival("", "", null, true)).toBeNull();
  });
});
