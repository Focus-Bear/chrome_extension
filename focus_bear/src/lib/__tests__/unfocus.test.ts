import { describe, it, expect } from "vitest";
import { computeUnfocusEndTime, isUnfocusSessionActive } from "../unfocus.js";

// ─── computeUnfocusEndTime ────────────────────────────────────────────────────

describe("computeUnfocusEndTime", () => {
  it("converts minutes to milliseconds and adds to start time", () => {
    const start = 1_000_000;
    expect(computeUnfocusEndTime(start, 30)).toBe(start + 30 * 60 * 1000);
  });

  it("handles a 1-minute session", () => {
    expect(computeUnfocusEndTime(0, 1)).toBe(60_000);
  });

  it("handles 0 duration (end time equals start time)", () => {
    expect(computeUnfocusEndTime(5_000, 0)).toBe(5_000);
  });
});

// ─── isUnfocusSessionActive ───────────────────────────────────────────────────

describe("isUnfocusSessionActive", () => {
  it("returns true when current time is before endTime", () => {
    expect(isUnfocusSessionActive(10_000, 5_000)).toBe(true);
  });

  it("returns false when current time equals endTime (expired)", () => {
    expect(isUnfocusSessionActive(5_000, 5_000)).toBe(false);
  });

  it("returns false when current time is past endTime", () => {
    expect(isUnfocusSessionActive(3_000, 8_000)).toBe(false);
  });
});
