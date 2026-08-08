import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createInvoice,
  createSubject,
  fetchInvoice,
  getAuthHeader,
  searchSubject,
  sendInvoiceEmail
} from "./fakturoid.js";

const AUTH = "Bearer test-token";

function mockFetch(body, { ok = true, status = 200 } = {}) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body)
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("getAuthHeader", () => {
  it("returns a Bearer auth header on success", async () => {
    vi.stubGlobal("fetch", mockFetch({ access_token: "abc123", token_type: "Bearer" }));
    expect(await getAuthHeader("clientId", "clientSecret")).toBe("Bearer abc123");
  });

  it("throws on Fakturoid OAuth error", async () => {
    vi.stubGlobal("fetch", mockFetch({ error: "invalid_client", error_description: "Bad credentials" }));
    await expect(getAuthHeader("bad", "creds")).rejects.toThrow("invalid_client");
  });
});

describe("fetchInvoice", () => {
  it("returns the invoice JSON on success", async () => {
    const invoice = { id: 42, number: "2025-0001" };
    vi.stubGlobal("fetch", mockFetch(invoice));
    expect(await fetchInvoice(AUTH, 42)).toEqual(invoice);
  });

  it("throws on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({ error: "not_found", error_description: "Invoice not found" }, { ok: false, status: 404 })
    );
    await expect(fetchInvoice(AUTH, 99)).rejects.toThrow("not_found");
  });
});

describe("createInvoice", () => {
  const invoiceData = {
    subjectId: 1,
    note: "Hacker Camp 2025",
    lines: [{ text: "Hacker ticket", count: 1, price: 7000 }]
  };

  it("returns the created invoice JSON on success", async () => {
    const created = { id: 100, number: "2025-0100" };
    vi.stubGlobal("fetch", mockFetch(created, { ok: true, status: 201 }));
    expect(await createInvoice(AUTH, invoiceData)).toEqual(created);
  });

  it("throws a FakturoidError on validation failure", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(
        { error: null, error_description: null, errors: ["subject_id is required"] },
        { ok: false, status: 422 }
      )
    );
    await expect(createInvoice(AUTH, invoiceData)).rejects.toThrow("Validation Error");
  });

  it("sends the correct API endpoint", async () => {
    const fetch = mockFetch({ id: 1 }, { ok: true, status: 201 });
    vi.stubGlobal("fetch", fetch);
    await createInvoice(AUTH, invoiceData);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/invoices.json"),
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("createSubject", () => {
  it("returns the created subject on success", async () => {
    const subject = { id: 55, name: "Jan Novák" };
    vi.stubGlobal("fetch", mockFetch(subject, { ok: true, status: 201 }));
    expect(await createSubject(AUTH, { name: "Jan Novák" })).toEqual(subject);
  });

  it("throws on error response", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({ error: "duplicate", error_description: "Already exists" }, { ok: false, status: 422 })
    );
    await expect(createSubject(AUTH, {})).rejects.toThrow("duplicate");
  });
});

describe("searchSubject", () => {
  it("returns search results on success", async () => {
    const results = [{ id: 1, name: "Jan Novák" }];
    vi.stubGlobal("fetch", mockFetch(results));
    expect(await searchSubject(AUTH, "Jan")).toEqual(results);
  });

  it("includes the query in the request URL", async () => {
    const fetch = mockFetch([]);
    vi.stubGlobal("fetch", fetch);
    await searchSubject(AUTH, "novák");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("query=nov%C3%A1k"),
      expect.anything()
    );
  });

  it("throws on a non-ok response", async () => {
    vi.stubGlobal("fetch", mockFetch({ error: "unauthorized" }, { ok: false, status: 401 }));
    await expect(searchSubject(AUTH, "test")).rejects.toThrow("unauthorized");
  });
});

describe("sendInvoiceEmail", () => {
  it("calls the correct message endpoint", async () => {
    const fetch = mockFetch({});
    vi.stubGlobal("fetch", fetch);
    await sendInvoiceEmail(AUTH, 42, "jan@example.com");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/invoices/42/message.json"),
      expect.objectContaining({ method: "POST" })
    );
  });
});
