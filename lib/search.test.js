import { describe, expect, it } from "vitest";
import { getAttendeesProjection, getRegistrationProjection } from "./search.js";

function makeReg(overrides = {}) {
  return {
    firstName: "Jan",
    lastName: "Novák",
    email: "jan@example.com",
    year: 2025,
    timestamp: "2025-01-10T12:00:00.000Z",
    invoiced: null,
    paid: null,
    firstTime: false,
    referral: null,
    ticketType: "hacker",
    approved: false,
    ...overrides
  };
}

describe("getRegistrationProjection", () => {
  it("generates objectID from year and email", () => {
    const result = getRegistrationProjection()(makeReg());
    expect(result.objectID).toBe("2025-jan@example.com");
  });

  it("combines firstName and lastName into name", () => {
    const result = getRegistrationProjection()(makeReg());
    expect(result.name).toBe("Jan Novák");
  });

  it("converts timestamp to numeric createdAt", () => {
    const result = getRegistrationProjection()(makeReg());
    expect(typeof result.createdAt).toBe("number");
    expect(result.createdAt).toBe(new Date("2025-01-10T12:00:00.000Z").getTime());
  });

  it("strips firstName, lastName, timestamp, paid, invoiced from output", () => {
    const result = getRegistrationProjection()(makeReg());
    expect(result.firstName).toBeUndefined();
    expect(result.lastName).toBeUndefined();
    expect(result.timestamp).toBeUndefined();
  });

  describe("_tags", () => {
    it("tags a paid registration with the year and 'paid'", () => {
      const result = getRegistrationProjection()(makeReg({ paid: "2025-02-01T00:00:00.000Z" }));
      expect(result._tags).toContain("2025");
      expect(result._tags).toContain("paid");
    });

    it("tags an invoiced (not yet paid) registration with 'invoiced'", () => {
      const result = getRegistrationProjection()(makeReg({ invoiced: "2025-01-20T00:00:00.000Z" }));
      expect(result._tags).toContain("invoiced");
    });

    it("tags a confirmed returning hacker with 'confirmed'", () => {
      const result = getRegistrationProjection()(makeReg({ firstTime: false }));
      expect(result._tags).toContain("confirmed");
    });

    it("tags an unconfirmed first-timer with no referral as 'waitingList'", () => {
      const result = getRegistrationProjection()(makeReg({ firstTime: true, approved: false, referral: null }));
      expect(result._tags).toContain("waitingList");
    });

    it("tags an approved first-timer as 'confirmed'", () => {
      const result = getRegistrationProjection()(makeReg({ firstTime: true, approved: true }));
      expect(result._tags).toContain("confirmed");
    });

    it("tags a paid volunteer as null (no extra tag, just year)", () => {
      const result = getRegistrationProjection()(makeReg({ ticketType: "volunteer", paid: "2025-02-01T00:00:00.000Z" }));
      expect(result._tags).not.toContain("paid");
      expect(result._tags).not.toContain("volunteer");
    });

    it("tags an unpaid volunteer with 'volunteer'", () => {
      const result = getRegistrationProjection()(makeReg({ ticketType: "volunteer" }));
      expect(result._tags).toContain("volunteer");
    });

    it("tags a paid staff member with just the year (no 'staff' or 'paid')", () => {
      const result = getRegistrationProjection()(makeReg({ ticketType: "staff", paid: "2025-02-01T00:00:00.000Z" }));
      expect(result._tags).not.toContain("staff");
      expect(result._tags).not.toContain("paid");
    });
  });
});

describe("getAttendeesProjection", () => {
  function makeAttendee(overrides = {}) {
    return {
      slackID: "U123",
      year: 2025,
      paid: "2025-02-01T00:00:00.000Z",
      housing: "tent",
      travel: "free-car",
      ticketType: "hacker",
      name: "Jan Novák",
      ...overrides
    };
  }

  it("generates objectID from year and slackID", () => {
    const result = getAttendeesProjection()(makeAttendee());
    expect(result.objectID).toBe("2025-U123");
  });

  it("converts paid timestamp to numeric createdAt", () => {
    const result = getAttendeesProjection()(makeAttendee());
    expect(result.createdAt).toBe(new Date("2025-02-01T00:00:00.000Z").getTime());
  });

  it("includes year, travel, housing and ticket tags", () => {
    const result = getAttendeesProjection()(makeAttendee());
    expect(result._tags).toContain("2025");
    expect(result._tags).toContain("tent");
    expect(result._tags).toContain("free-car");
    expect(result._tags).toContain("hacker");
  });

  it.each([
    ["nonprofit", ["nonprofit", "hacker"]],
    ["hacker-plus", ["hacker-plus", "hacker"]],
    ["hacker-patron", ["hacker-patron", "hacker"]],
    ["crew", ["crew"]],
  ])("includes correct ticket tags for %s", (ticketType, expectedTags) => {
    const result = getAttendeesProjection()(makeAttendee({ ticketType }));
    for (const tag of expectedTags) {
      expect(result._tags).toContain(tag);
    }
  });

  it("filters out falsy tag values", () => {
    const result = getAttendeesProjection()(makeAttendee({ travel: null, housing: null }));
    expect(result._tags).not.toContain(null);
    expect(result._tags.every(Boolean)).toBe(true);
  });
});
