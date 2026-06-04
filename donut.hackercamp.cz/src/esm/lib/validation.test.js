import { describe, expect, it } from "vitest";
import { isISODateTime } from "./validation.js";

describe("isISODateTime", () => {
  it.each([
    "2023-09-01T14:00:00",
    "2023-09-01T14:00:00.123",
    "2022-01-31T23:59:59.999",
    "2023-09-01T14:00",
  ])("returns true for valid ISO datetime %s", (value) => {
    expect(isISODateTime(value)).toBe(true);
  });

  it.each([
    ["a plain date string", "2023-09-01"],
    ["a time-only string", "14:00:00"],
    ["a random string", "not-a-date"],
    ["an empty string", ""],
    ["a number", 123],
    ["null", null],
    ["undefined", undefined],
    ["an object", {}],
  ])("returns false for %s", (_, value) => {
    expect(isISODateTime(value)).toBe(false);
  });
});
