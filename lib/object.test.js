import { describe, expect, it } from "vitest";
import { selectKeys } from "./object.js";

describe("selectKeys", () => {
  it("returns only the specified keys", () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(selectKeys(obj, new Set(["a", "c"]))).toEqual({ a: 1, c: 3 });
  });

  it("returns an empty object when no keys match", () => {
    expect(selectKeys({ a: 1 }, new Set(["z"]))).toEqual({});
  });

  it("returns an empty object for an empty key set", () => {
    expect(selectKeys({ a: 1 }, new Set())).toEqual({});
  });

  it("applies the mapper to each included entry", () => {
    const obj = { housing: "glamping", name: "Jan" };
    const mapper = ([k, v]) => k === "housing" && v === "glamping" ? [k, "tent"] : [k, v];
    expect(selectKeys(obj, new Set(["housing"]), mapper)).toEqual({ housing: "tent" });
  });

  it("ignores keys present in the set but absent from the object", () => {
    expect(selectKeys({ a: 1 }, new Set(["a", "missing"]))).toEqual({ a: 1 });
  });
});
