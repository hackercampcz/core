import { afterEach, describe, expect, it, vi } from "vitest";
import { submitDecorator, withAuthHandler, withErrorReporting } from "./remoting.js";

describe("withAuthHandler", () => {
  it("returns the response when the status is 2xx", async () => {
    const resp = { status: 200 };
    await expect(withAuthHandler(Promise.resolve(resp))).resolves.toBe(resp);
  });

  it("calls onUnauthenticated and returns its result when status is 401", async () => {
    const onUnauthenticated = vi.fn().mockResolvedValue("redirected");
    const result = await withAuthHandler(Promise.resolve({ status: 401 }), { onUnauthenticated });
    expect(onUnauthenticated).toHaveBeenCalled();
    expect(result).toBe("redirected");
  });

  it("calls onUnauthorized and returns its result when status is 403", async () => {
    const onUnauthorized = vi.fn().mockResolvedValue("forbidden");
    const result = await withAuthHandler(Promise.resolve({ status: 403 }), { onUnauthorized });
    expect(onUnauthorized).toHaveBeenCalled();
    expect(result).toBe("forbidden");
  });

  it("does not call onUnauthenticated for non-401 responses", async () => {
    const onUnauthenticated = vi.fn();
    await withAuthHandler(Promise.resolve({ status: 200 }), { onUnauthenticated });
    expect(onUnauthenticated).not.toHaveBeenCalled();
  });
});

describe("withErrorReporting", () => {
  it("returns the response when ok", async () => {
    const resp = { ok: true };
    await expect(withErrorReporting(Promise.resolve(resp), {})).resolves.toBe(resp);
  });

  it("calls rollbar.error and onError when the response is not ok", async () => {
    const error = { message: "Bad request" };
    const resp = { ok: false, json: vi.fn().mockResolvedValue(error) };
    const rollbar = { error: vi.fn() };
    const onError = vi.fn();
    await withErrorReporting(Promise.resolve(resp), { rollbar, onError });
    expect(rollbar.error).toHaveBeenCalledWith(error);
    expect(onError).toHaveBeenCalledWith(error);
  });

  it("still returns the response even when it is not ok", async () => {
    const resp = { ok: false, json: vi.fn().mockResolvedValue({}) };
    const result = await withErrorReporting(Promise.resolve(resp), {});
    expect(result).toBe(resp);
  });

  it("calls rollbar.error and onError when fetch rejects", async () => {
    const err = new Error("Network failure");
    const rollbar = { error: vi.fn() };
    const onError = vi.fn();
    await expect(
      withErrorReporting(Promise.reject(err), { rollbar, onError })
    ).rejects.toThrow("Network failure");
    expect(rollbar.error).toHaveBeenCalledWith(err);
    expect(onError).toHaveBeenCalledWith(err);
  });
});

describe("submitDecorator", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("calls preventDefault on the event", async () => {
    const form = document.createElement("form");
    const button = document.createElement("button");
    button.type = "submit";
    form.appendChild(button);
    document.body.appendChild(form);

    const handler = vi.fn().mockResolvedValue(undefined);
    const event = { preventDefault: vi.fn(), target: form };
    await submitDecorator(handler)(event);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("calls the wrapped handler with the event", async () => {
    const form = document.createElement("form");
    const button = document.createElement("button");
    button.type = "submit";
    form.appendChild(button);
    document.body.appendChild(form);

    const handler = vi.fn().mockResolvedValue(undefined);
    const event = { preventDefault: vi.fn(), target: form };
    await submitDecorator(handler)(event);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it("re-enables the submit button and removes the busy class after the handler resolves", async () => {
    const form = document.createElement("form");
    const button = document.createElement("button");
    button.type = "submit";
    form.appendChild(button);
    document.body.appendChild(form);

    const handler = vi.fn().mockResolvedValue(undefined);
    const event = { preventDefault: vi.fn(), target: form };
    await submitDecorator(handler)(event);

    expect(button.disabled).toBe(false);
    expect(document.body.classList.contains("wurk-too-hard")).toBe(false);
  });

  it("disables the submit button while the handler is executing", async () => {
    const form = document.createElement("form");
    const button = document.createElement("button");
    button.type = "submit";
    form.appendChild(button);
    document.body.appendChild(form);

    let capturedDisabledState;
    const handler = vi.fn().mockImplementation(async () => {
      capturedDisabledState = button.disabled;
    });
    const event = { preventDefault: vi.fn(), target: form };
    await submitDecorator(handler)(event);

    expect(capturedDisabledState).toBe(true);
  });
});
