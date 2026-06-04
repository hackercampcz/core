import { afterEach, describe, expect, it, vi } from "vitest";
import { getSlackProfile, getTeamProfile, setSlackProfile } from "./slack.js";

function mockFetch(payload) {
  return vi.fn().mockResolvedValue({ json: () => Promise.resolve(payload) });
}

afterEach(() => vi.unstubAllGlobals());

describe("getSlackProfile", () => {
  it("returns the profile on a successful response", async () => {
    vi.stubGlobal("fetch", mockFetch({ ok: true, profile: { display_name: "rarous" } }));
    const profile = await getSlackProfile("U123", "xoxp-token");
    expect(profile).toEqual({ display_name: "rarous" });
  });

  it("throws with the Slack error message on failure", async () => {
    vi.stubGlobal("fetch", mockFetch({ ok: false, error: "not_authed" }));
    await expect(getSlackProfile("U123", "xoxp-token")).rejects.toThrow(
      "Get slack profile failed: not_authed"
    );
  });

  it("calls the correct Slack API endpoint", async () => {
    const fetch = mockFetch({ ok: true, profile: {} });
    vi.stubGlobal("fetch", fetch);
    await getSlackProfile("U123", "xoxp-token");
    expect(fetch).toHaveBeenCalledWith(
      "https://slack.com/api/users.profile.get",
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("getTeamProfile", () => {
  it("returns the team profile on a successful response", async () => {
    vi.stubGlobal("fetch", mockFetch({ ok: true, profile: { fields: [] } }));
    const profile = await getTeamProfile("xoxp-token");
    expect(profile).toEqual({ fields: [] });
  });

  it("throws with the Slack error message on failure", async () => {
    vi.stubGlobal("fetch", mockFetch({ ok: false, error: "invalid_auth" }));
    await expect(getTeamProfile("xoxp-token")).rejects.toThrow(
      "Get slack profile failed: invalid_auth"
    );
  });
});

describe("setSlackProfile", () => {
  it("returns the updated profile on success", async () => {
    vi.stubGlobal("fetch", mockFetch({ ok: true, profile: { display_name: "updated" } }));
    const profile = await setSlackProfile("U123", "xoxp-token", {
      name: "display_name",
      value: "updated"
    });
    expect(profile).toEqual({ display_name: "updated" });
  });

  it("throws with the Slack error message on failure", async () => {
    vi.stubGlobal("fetch", mockFetch({ ok: false, error: "cant_update_admin_user" }));
    await expect(
      setSlackProfile("U123", "xoxp-token", { name: "display_name", value: "x" })
    ).rejects.toThrow("Set Slack profile failed: cant_update_admin_user");
  });

  it("calls the correct Slack API endpoint", async () => {
    const fetch = mockFetch({ ok: true, profile: {} });
    vi.stubGlobal("fetch", fetch);
    await setSlackProfile("U123", "xoxp-token", { name: "field", value: "val" });
    expect(fetch).toHaveBeenCalledWith(
      "https://slack.com/api/users.profile.set",
      expect.objectContaining({ method: "POST" })
    );
  });
});
