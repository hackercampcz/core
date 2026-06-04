import { describe, expect, it } from "vitest";
import { attributes, mapper } from "./attendee.js";

describe("mapper", () => {
  it("normalises glamping to tent", () => {
    expect(mapper(["housing", "glamping"])).toEqual(["housing", "tent"]);
  });

  it("leaves other housing values unchanged", () => {
    expect(mapper(["housing", "cottage"])).toEqual(["housing", "cottage"]);
    expect(mapper(["housing", "tent"])).toEqual(["housing", "tent"]);
  });

  it("leaves non-housing keys unchanged", () => {
    expect(mapper(["email", "user@example.com"])).toEqual(["email", "user@example.com"]);
    expect(mapper(["ticketType", "hacker"])).toEqual(["ticketType", "hacker"]);
  });
});

describe("attributes", () => {
  it("is a Set", () => {
    expect(attributes).toBeInstanceOf(Set);
  });

  it.each(["housing", "email", "paid", "ticketType", "year", "travel"])(
    "includes %s",
    (key) => {
      expect(attributes.has(key)).toBe(true);
    }
  );
});
