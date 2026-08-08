import { beforeEach, describe, expect, it } from "vitest";
import { isSignedIn } from "./profile.js";
import { memoryStorage } from "./storage.js";

/** Build a minimal JWT with the given `exp` (Unix seconds). The signature is fake — we only need to test the payload decoding. */
function makeJWT(exp) {
  const encode = obj => btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({ exp });
  return `${header}.${payload}.fakesignature`;
}

const nowSecs = () => Math.floor(Date.now() / 1000);

describe("isSignedIn", () => {
  beforeEach(() => {
    localStorage.clear();
    memoryStorage.clear();
  });

  it("returns false when no token is stored", () => {
    expect(isSignedIn()).toBe(false);
  });

  it("returns false for an expired token", () => {
    localStorage.setItem("hc:id_token", makeJWT(nowSecs() - 3600));
    expect(isSignedIn()).toBe(false);
  });

  it("returns true for a valid token", () => {
    localStorage.setItem("hc:id_token", makeJWT(nowSecs() + 86400));
    expect(isSignedIn()).toBe(true);
  });

  it("returns false for a malformed token", () => {
    localStorage.setItem("hc:id_token", "not.a.jwt");
    expect(isSignedIn()).toBe(false);
  });

  it("returns false for a token missing the exp claim", () => {
    const encode = obj => btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: "U123" })}.sig`;
    localStorage.setItem("hc:id_token", token);
    expect(isSignedIn()).toBe(false);
  });
});
