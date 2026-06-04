import { describe, expect, it } from "vitest";
import { sortBy } from "./array.js";

describe("sortBy", () => {
  it("sorts descending by default", () => {
    const result = sortBy("name", [{ name: "Zdeněk" }, { name: "Aleš" }, { name: "Martin" }]);
    expect(result.map(x => x.name)).toEqual(["Zdeněk", "Martin", "Aleš"]);
  });

  it("sorts ascending when asc: true", () => {
    const result = sortBy("name", [{ name: "Zdeněk" }, { name: "Aleš" }, { name: "Martin" }], { asc: true });
    expect(result.map(x => x.name)).toEqual(["Aleš", "Martin", "Zdeněk"]);
  });

  it("places items without the attribute at the front when descending", () => {
    const result = sortBy("name", [{ name: "Zdeněk" }, {}, { name: "Aleš" }]);
    expect(result[0].name).toBeUndefined();
  });

  it("returns the same array reference (sort is in-place)", () => {
    const arr = [{ name: "B" }, { name: "A" }];
    expect(sortBy("name", arr)).toBe(arr);
  });
});
