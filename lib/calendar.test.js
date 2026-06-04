import { describe, expect, it } from "vitest";
import { calendarEvent, iCal } from "./calendar.js";

describe("iCal", () => {
  it("starts and ends with VCALENDAR markers", () => {
    const cal = iCal("20250828", "20250831");
    expect(cal.trim()).toMatch(/^BEGIN:VCALENDAR/);
    expect(cal.trim()).toMatch(/END:VCALENDAR$/);
  });

  it("contains a VEVENT with the provided start and end dates", () => {
    const cal = iCal("20250828", "20250831");
    expect(cal).toContain("DTSTART;VALUE=DATE:20250828");
    expect(cal).toContain("DTEND;VALUE=DATE:20250831");
  });

  it("contains VEVENT begin/end markers", () => {
    const cal = iCal("20250828", "20250831");
    expect(cal).toContain("BEGIN:VEVENT");
    expect(cal).toContain("END:VEVENT");
  });

  it("contains the event summary", () => {
    expect(iCal("20250828", "20250831")).toContain("SUMMARY:Hacker Camp");
  });

  it("contains a UID ending in @hckr.camp", () => {
    expect(iCal("20250828", "20250831")).toMatch(/UID:.+@hckr\.camp/);
  });

  it("uses different UIDs on consecutive calls", () => {
    expect(iCal("20250828", "20250831")).not.toBe(iCal("20250828", "20250831"));
  });
});

describe("calendarEvent", () => {
  it("returns a non-empty string", () => {
    const result = calendarEvent("20250828", "20250831");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns valid base64 characters", () => {
    expect(calendarEvent("20250828", "20250831")).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("encodes different content for different date ranges", () => {
    expect(calendarEvent("20250828", "20250831")).not.toBe(calendarEvent("20260827", "20260830"));
  });
});
