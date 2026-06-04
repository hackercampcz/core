import { describe, expect, it, vi } from "vitest";
import { instatializeDates, objectForeach, objectWalk } from "./object.js";

describe("objectForeach", () => {
  it("calls the callback for each own enumerable property", () => {
    const obj = { a: 1, b: 2, c: 3 };
    const callback = vi.fn();
    objectForeach(obj, callback);
    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenCalledWith(1, "a", obj);
    expect(callback).toHaveBeenCalledWith(2, "b", obj);
    expect(callback).toHaveBeenCalledWith(3, "c", obj);
  });

  it("returns the original object", () => {
    const obj = { x: 1 };
    expect(objectForeach(obj, () => {})).toBe(obj);
  });

  it("does not iterate over inherited properties", () => {
    const obj = Object.create({ inherited: true });
    obj.own = 1;
    const keys = [];
    objectForeach(obj, (_, key) => keys.push(key));
    expect(keys).toEqual(["own"]);
  });

  it("does nothing on an empty object", () => {
    const callback = vi.fn();
    objectForeach({}, callback);
    expect(callback).not.toHaveBeenCalled();
  });
});

describe("objectWalk", () => {
  it("visits all nodes top-down via the descent callback", () => {
    const obj = { a: { b: 1 }, c: 2 };
    const visited = [];
    objectWalk(obj, (_, key) => visited.push(key));
    expect(visited).toContain("a");
    expect(visited).toContain("c");
    expect(visited).toContain("b");
  });

  it("visits object nodes bottom-up via the ascent callback", () => {
    const obj = { nested: { x: 1 } };
    const ascended = [];
    objectWalk(obj, null, (_, key) => ascended.push(key));
    expect(ascended).toContain("nested");
  });

  it("visits descent before ascent for nested nodes", () => {
    const obj = { parent: { child: 1 } };
    const order = [];
    objectWalk(
      obj,
      (_, key) => order.push(`down:${key}`),
      (_, key) => order.push(`up:${key}`)
    );
    expect(order.indexOf("down:parent")).toBeLessThan(order.indexOf("up:parent"));
  });

  it("returns the original object", () => {
    const obj = { a: 1 };
    expect(objectWalk(obj)).toBe(obj);
  });
});

describe("instatializeDates", () => {
  it("converts ISO datetime strings to Date instances", () => {
    const input = { createdAt: "2023-09-01T14:00:00", name: "test" };
    const result = instatializeDates(input);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.createdAt.getFullYear()).toBe(2023);
  });

  it("converts nested ISO datetime strings", () => {
    const input = { meta: { updatedAt: "2023-09-01T14:00:00.000" } };
    const result = instatializeDates(input);
    expect(result.meta.updatedAt).toBeInstanceOf(Date);
  });

  it("does not mutate the original object", () => {
    const input = { createdAt: "2023-09-01T14:00:00" };
    instatializeDates(input);
    expect(input.createdAt).toBe("2023-09-01T14:00:00");
  });

  it("leaves non-datetime strings and numbers unchanged", () => {
    const input = { name: "Hacker Camp", count: 42 };
    const result = instatializeDates(input);
    expect(result.name).toBe("Hacker Camp");
    expect(result.count).toBe(42);
  });
});
