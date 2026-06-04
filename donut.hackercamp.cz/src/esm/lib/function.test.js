import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { debounce, throttle } from "./function.js";

describe("debounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("does not invoke the function before the delay elapses", () => {
    const fn = vi.fn();
    debounce(fn, 100)();
    expect(fn).not.toHaveBeenCalled();
  });

  it("invokes the function once after the delay", () => {
    const fn = vi.fn();
    debounce(fn, 100)();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("invokes only once after multiple rapid calls", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    debounced();
    debounced();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("resets the timer on each call", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    vi.advanceTimersByTime(50);
    debounced(); // resets timer
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("defaults to a 100ms delay", () => {
    const fn = vi.fn();
    debounce(fn)();
    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe("throttle", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("invokes the function immediately on the first call (leading edge)", () => {
    const fn = vi.fn();
    throttle(fn, 100)();
    expect(fn).toHaveBeenCalledOnce();
  });

  it("does not invoke again within the wait period", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled();
    throttled();
    throttled();
    expect(fn).toHaveBeenCalledOnce();
  });

  it("invokes the trailing call after the wait period", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled();        // leading — fires now
    throttled();        // schedules trailing
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("suppresses the leading call when leading: false", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100, { leading: false });
    throttled();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("suppresses the trailing call when trailing: false", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100, { trailing: false });
    throttled(); // leading fires
    throttled(); // trailing suppressed
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
  });
});
