import { beforeEach, describe, expect, it } from "vitest";
import { SafeStorage, memoryStorage } from "./storage.js";

// A minimal Storage-compatible object used as the primary in SafeStorage tests.
function makeStorage() {
  const data = new Map();
  return {
    get length() { return data.size; },
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key),
    clear: () => data.clear()
  };
}

describe("memoryStorage", () => {
  beforeEach(() => memoryStorage.clear());

  it("stores and retrieves a value", () => {
    memoryStorage.setItem("key", "value");
    expect(memoryStorage.getItem("key")).toBe("value");
  });

  it("returns undefined for a missing key", () => {
    expect(memoryStorage.getItem("missing")).toBeUndefined();
  });

  it("removes a stored item", () => {
    memoryStorage.setItem("key", "value");
    memoryStorage.removeItem("key");
    expect(memoryStorage.getItem("key")).toBeUndefined();
  });

  it("clears all items and resets length to 0", () => {
    memoryStorage.setItem("a", "1");
    memoryStorage.setItem("b", "2");
    memoryStorage.clear();
    expect(memoryStorage.length).toBe(0);
  });

  it("tracks length correctly", () => {
    expect(memoryStorage.length).toBe(0);
    memoryStorage.setItem("x", "1");
    expect(memoryStorage.length).toBe(1);
    memoryStorage.setItem("y", "2");
    expect(memoryStorage.length).toBe(2);
  });
});

describe("SafeStorage", () => {
  let primary;
  let storage;

  beforeEach(() => {
    memoryStorage.clear();
    primary = makeStorage();
    storage = new SafeStorage(primary);
  });

  it("writes to the primary storage", () => {
    storage.setItem("key", "value");
    expect(primary.getItem("key")).toBe("value");
  });

  it("also writes to the memoryStorage fallback", () => {
    storage.setItem("key", "value");
    expect(memoryStorage.getItem("key")).toBe("value");
  });

  it("reads from the primary storage first", () => {
    primary.setItem("key", "primary-value");
    memoryStorage.setItem("key", "fallback-value");
    expect(storage.getItem("key")).toBe("primary-value");
  });

  it("falls back to memoryStorage when primary lacks the key", () => {
    memoryStorage.setItem("key", "fallback-value");
    expect(storage.getItem("key")).toBe("fallback-value");
  });

  it("removes a key from both primary and fallback", () => {
    storage.setItem("key", "value");
    storage.removeItem("key");
    expect(primary.getItem("key")).toBeNull();
    expect(memoryStorage.getItem("key")).toBeUndefined();
  });

  it("clears both primary and fallback", () => {
    storage.setItem("a", "1");
    storage.clear();
    expect(primary.length).toBe(0);
    expect(memoryStorage.length).toBe(0);
  });

  describe("when primary is undefined", () => {
    beforeEach(() => {
      memoryStorage.clear();
      storage = new SafeStorage(undefined);
    });

    it("writes to and reads from the memoryStorage fallback", () => {
      storage.setItem("key", "value");
      expect(storage.getItem("key")).toBe("value");
      expect(memoryStorage.getItem("key")).toBe("value");
    });

    it("removes items from the fallback", () => {
      storage.setItem("key", "value");
      storage.removeItem("key");
      expect(storage.getItem("key")).toBeUndefined();
    });
  });
});
