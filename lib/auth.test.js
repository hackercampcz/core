import {describe, expect, it} from "vitest";
import {authorize, createCookie, getCookies, getToken, signJWT, validateToken} from "./auth.js";

// Must be ≥32 bytes for HS256
const TEST_SECRET = "test-secret-key-for-testing-only";

describe("getCookies", () => {
  it("parses cookie", () => {
    const cookies = getCookies(new Headers({ Cookie: "hc-id=abc123; other=val" }));
    expect(cookies["hc-id"]).toBe("abc123");
    expect(cookies["other"]).toBe("val");
  });

  it("returns null when no cookie header is present", () => {
    expect(getCookies(new Headers())).toBeNull();
    expect(getCookies(null)).toBeNull();
  });
});

describe("getToken", () => {
  it("reads token from the hc-id cookie", () => {
    expect(getToken(new Headers({ Cookie: "hc-id=mytoken" }))).toBe("mytoken");
  });

  it("reads token from Bearer Authorization header", () => {
    expect(getToken(new Headers({ Authorization: "Bearer mytoken" }))).toBe("mytoken");
  });

  it("returns null when there is no token", () => {
    expect(getToken(new Headers())).toBeNull();
    expect(getToken(new Headers({ Authorization: "Basic abc" }))).toBeNull();
  });
});

describe("createCookie", () => {
  it("serialises the token into an hc-id cookie", () => {
    const cookie = createCookie("mytoken", {});
    expect(cookie).toContain("hc-id=mytoken");
  });

  it("forwards cookie options such as HttpOnly and Max-Age", () => {
    const cookie = createCookie("mytoken", { httpOnly: true, maxAge: 3600 });
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Max-Age=3600");
  });
});

describe("validateToken", () => {
  it("returns false for a null token", async () => {
    expect(await validateToken(null, TEST_SECRET)).toBe(false);
  });

  it("returns null for an invalid/tampered token", async () => {
    expect(await validateToken("not.a.valid.jwt", TEST_SECRET)).toBeNull();
  });

  it("returns the payload for a valid signed token", async () => {
    const token = await signJWT({ "https://hackercamp.cz/email": "jan@example.com" }, TEST_SECRET);
    const payload = await validateToken(token, TEST_SECRET);
    expect(payload["https://hackercamp.cz/email"]).toBe("jan@example.com");
  });
});

describe("signJWT", () => {
  it("returns a JWT string with three dot-separated segments", async () => {
    const token = await signJWT({ sub: "U123" }, TEST_SECRET);
    expect(token.split(".")).toHaveLength(3);
  });
});

describe("authorize", () => {
  it("returns true for the admin role when the token carries is_admin=true", async () => {
    const token = await signJWT({ "https://hackercamp.cz/is_admin": true }, TEST_SECRET);
    expect(await authorize("admin", token, TEST_SECRET)).toBe(true);
  });

  it("returns false for the admin role when is_admin is falsy", async () => {
    const token = await signJWT({ "https://hackercamp.cz/is_admin": false }, TEST_SECRET);
    expect(await authorize("admin", token, TEST_SECRET)).toBe(false);
  });

  it("returns false for any unknown role", async () => {
    const token = await signJWT({ "https://hackercamp.cz/is_admin": true }, TEST_SECRET);
    expect(await authorize("editor", token, TEST_SECRET)).toBe(false);
  });
});
