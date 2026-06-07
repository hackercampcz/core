import {describe, expect, it} from "vitest";
import {isEnded, willStartSoon} from "./event.js";

const event2025 = {
  startDate: Temporal.ZonedDateTime.from("2025-08-28T17:00:00+02:00[Europe/Prague]"),
  endDate: Temporal.ZonedDateTime.from("2025-08-31T12:00:00+02:00[Europe/Prague]"),
};

describe("isEnded", () => {

  it("returns true when the requested year is before the event's start year", () => {
    expect(isEnded(event2025, 2024)).toBe(true);
  });

  it("returns true when the event end date is in the past", () => {
    expect(isEnded(Object.assign({today: Temporal.PlainDate.from("2025-09-01")}, event2025), 2025)).toBe(true);
  });

  it("returns false while the event is still ongoing", () => {
    expect(isEnded(Object.assign({today: Temporal.PlainDate.from("2025-08-29")}, event2025), 2025)).toBe(false);
  });

  it("returns false on the start day", () => {
    expect(isEnded(Object.assign({today: Temporal.PlainDate.from("2025-08-28")}, event2025), 2025)).toBe(false);
  });
});

describe("willStartSoon", () => {

  it("returns true when today is within the 3 days before start", () => {
    expect(willStartSoon(Object.assign({today: Temporal.PlainDate.from("2025-08-26")}, event2025))).toBe(true);
  });

  it("returns true on the day the 3-day window opens", () => {
    expect(willStartSoon(Object.assign({today: Temporal.PlainDate.from("2025-08-25")}, event2025))).toBe(true);
  });

  it("returns false more than 3 days before start", () => {
    expect(willStartSoon(Object.assign({today: Temporal.PlainDate.from("2025-08-20")}, event2025))).toBe(false);
  });

  it("returns true during the event", () => {
    expect(willStartSoon(Object.assign({today: Temporal.PlainDate.from("2025-08-29")}, event2025))).toBe(true);
  });

  it("returns false after the event has ended", () => {
    expect(willStartSoon(Object.assign({today: Temporal.PlainDate.from("2025-09-01")}, event2025))).toBe(false);
  });
});
