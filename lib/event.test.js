import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isEnded, willStartSoon } from "./event.js";

const event2025 = {
  startDate: new Date("2025-08-28T14:00:00+02:00"),
  endDate: new Date("2025-08-31T12:00:00+02:00")
};

describe("isEnded", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns true when the requested year is before the event's start year", () => {
    expect(isEnded(event2025, 2024)).toBe(true);
  });

  it("returns true when the event end date is in the past", () => {
    vi.setSystemTime(new Date("2025-09-01T00:00:00Z"));
    expect(isEnded(event2025, 2025)).toBe(true);
  });

  it("returns false while the event is still ongoing", () => {
    vi.setSystemTime(new Date("2025-08-29T12:00:00Z"));
    expect(isEnded(event2025, 2025)).toBe(false);
  });

  it("returns false on the start day", () => {
    vi.setSystemTime(new Date("2025-08-28T00:00:00Z"));
    expect(isEnded(event2025, 2025)).toBe(false);
  });
});

describe("willStartSoon", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns true when today is within the 3 days before start", () => {
    vi.setSystemTime(new Date("2025-08-26T12:00:00+02:00")); // 2 days before
    expect(willStartSoon(event2025)).toBe(true);
  });

  it("returns true on the day the 3-day window opens", () => {
    vi.setSystemTime(new Date("2025-08-25T00:00:00+02:00")); // exactly 3 days before
    expect(willStartSoon(event2025)).toBe(true);
  });

  it("returns false more than 3 days before start", () => {
    vi.setSystemTime(new Date("2025-08-20T12:00:00+02:00"));
    expect(willStartSoon(event2025)).toBe(false);
  });

  it("returns true during the event", () => {
    vi.setSystemTime(new Date("2025-08-29T12:00:00+02:00"));
    expect(willStartSoon(event2025)).toBe(true);
  });

  it("returns false after the event has ended", () => {
    vi.setSystemTime(new Date("2025-09-01T00:00:00+02:00"));
    expect(willStartSoon(event2025)).toBe(false);
  });
});
