import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatLongDayName,
  formatMoney,
  formatNumber,
  formatPercents,
  formatShortDate,
  formatShortDayName,
  formatTime
} from "./format.js";

// Fixed reference date: Thursday, 28 August 2025 at 14:30
const REF_DATE = new Date("2025-08-28T14:30:00+02:00");

describe("formatMoney", () => {
  it("returns null for null", () => expect(formatMoney(null)).toBeNull());
  it("returns null for undefined", () => expect(formatMoney(undefined)).toBeNull());

  it("replaces trailing ,00 with ,- for whole numbers", () => {
    expect(formatMoney(5000)).toContain(",-");
    expect(formatMoney(0)).toContain(",-");
  });

  it("keeps decimal places for non-whole amounts", () => {
    const result = formatMoney(5000.5);
    expect(result).not.toContain(",-");
    expect(result).toMatch(/[,.]5/); // decimal part present
  });
});

describe("formatNumber", () => {
  it("returns null for null", () => expect(formatNumber(null)).toBeNull());
  it("returns null for undefined", () => expect(formatNumber(undefined)).toBeNull());
  it("returns a string for a valid number", () => expect(typeof formatNumber(42)).toBe("string"));
  it("formats 1000 with a thousands separator", () => expect(formatNumber(1000)).toMatch(/1.000/));
});

describe("formatPercents", () => {
  it("returns null for null", () => expect(formatPercents(null)).toBeNull());
  it("returns null for undefined", () => expect(formatPercents(undefined)).toBeNull());
  it("includes the % sign", () => expect(formatPercents(0.5)).toContain("%"));
  it("rounds to the nearest integer percent", () => {
    expect(formatPercents(0.5)).toContain("50");
    expect(formatPercents(1 / 3)).toContain("33");
  });
});

describe("formatDate", () => {
  it("returns null for null", () => expect(formatDate(null)).toBeNull());
  it("contains the year", () => expect(formatDate(REF_DATE)).toContain("2025"));
  it("contains the day number", () => expect(formatDate(REF_DATE)).toContain("28"));
});

describe("formatShortDate", () => {
  it("returns null for null", () => expect(formatShortDate(null)).toBeNull());
  it("returns a non-empty string for a valid date", () => expect(formatShortDate(REF_DATE).length).toBeGreaterThan(0));
});

describe("formatTime", () => {
  it("returns null for null", () => expect(formatTime(null)).toBeNull());
  it("contains hours and minutes separated by :", () => expect(formatTime(REF_DATE)).toMatch(/\d{1,2}:\d{2}/));
});

describe("formatLongDayName", () => {
  it("returns null for null", () => expect(formatLongDayName(null)).toBeNull());
  it("returns a non-empty string for a valid date", () =>
    expect(formatLongDayName(REF_DATE).length).toBeGreaterThan(0));
});

describe("formatShortDayName", () => {
  it("returns null for null", () => expect(formatShortDayName(null)).toBeNull());
  it("returns a non-empty string for a valid date", () =>
    expect(formatShortDayName(REF_DATE).length).toBeGreaterThan(0));
});

describe("formatDateTime", () => {
  it("returns null for null", () => expect(formatDateTime(null)).toBeNull());
  it("returns a non-empty string for a valid date", () => expect(formatDateTime(REF_DATE).length).toBeGreaterThan(0));
});
