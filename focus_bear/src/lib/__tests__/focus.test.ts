import { describe, it, expect } from "vitest";
import {
  isFocusActive,
  buildFocusSessionState,
  computeTimeLeft,
  buildResumedSessionState,
} from "../focus.js";

// ─── isFocusActive ────────────────────────────────────────────────────────────

describe("isFocusActive", () => {
  it("returns true when started and not on break", () => {
    expect(isFocusActive({ started: true, onBreak: false })).toBe(true);
  });

  it("returns true when onBreak is undefined (not set)", () => {
    expect(isFocusActive({ started: true })).toBe(true);
  });

  it("returns false when on break", () => {
    expect(isFocusActive({ started: true, onBreak: true })).toBe(false);
  });

  it("returns false when not started", () => {
    expect(isFocusActive({ started: false })).toBe(false);
  });

  it("returns false for undefined state (no session)", () => {
    expect(isFocusActive(undefined)).toBe(false);
  });

  it("returns false for empty state object", () => {
    expect(isFocusActive({})).toBe(false);
  });

  // Pausing sets isRunning=false but leaves started=true, onBreak=false.
  // Blocking should stay active while paused — isFocusActive intentionally ignores isRunning.
  it("returns true for a paused session (isRunning=false does not disable blocking)", () => {
    expect(isFocusActive({ started: true, onBreak: false, isRunning: false })).toBe(true);
  });
});

// ─── buildFocusSessionState ───────────────────────────────────────────────────

describe("buildFocusSessionState", () => {
  const NOW = 1_000_000;

  it("builds a work-phase session with correct endTime", () => {
    const state = buildFocusSessionState({
      workDuration: 25 * 60, // 25 min in seconds
      breakDuration: 5 * 60,
      onBreak: false,
      now: NOW,
    });
    expect(state.started).toBe(true);
    expect(state.isRunning).toBe(true);
    expect(state.onBreak).toBe(false);
    expect(state.startTime).toBe(NOW);
    expect(state.endTime).toBe(NOW + 25 * 60 * 1000);
  });

  it("builds a break-phase session using breakDuration", () => {
    const state = buildFocusSessionState({
      workDuration: 25 * 60,
      breakDuration: 5 * 60,
      onBreak: true,
      now: NOW,
    });
    expect(state.onBreak).toBe(true);
    expect(state.endTime).toBe(NOW + 5 * 60 * 1000);
  });

  it("defaults task to empty string when omitted", () => {
    const state = buildFocusSessionState({ workDuration: 60, breakDuration: 60, onBreak: false, now: NOW });
    expect(state.task).toBe("");
  });

  it("preserves a provided task label", () => {
    const state = buildFocusSessionState({
      workDuration: 60,
      breakDuration: 60,
      onBreak: false,
      task: "Write tests",
      now: NOW,
    });
    expect(state.task).toBe("Write tests");
  });

  // workDuration and breakDuration are read back from state by the alarm handler
  // when transitioning between work and break phases — must not be dropped or swapped.
  it("stores both workDuration and breakDuration in state", () => {
    const state = buildFocusSessionState({
      workDuration: 25 * 60,
      breakDuration: 5 * 60,
      onBreak: false,
      now: NOW,
    });
    expect(state.workDuration).toBe(25 * 60);
    expect(state.breakDuration).toBe(5 * 60);
  });
});

// ─── computeTimeLeft ──────────────────────────────────────────────────────────

describe("computeTimeLeft", () => {
  it("returns remaining seconds correctly", () => {
    expect(computeTimeLeft({ endTime: 10_000 }, 7_000)).toBe(3);
  });

  it("returns 0 when session has already expired", () => {
    expect(computeTimeLeft({ endTime: 1_000 }, 5_000)).toBe(0);
  });

  it("returns 0 when exactly at endTime (no negative time)", () => {
    expect(computeTimeLeft({ endTime: 5_000 }, 5_000)).toBe(0);
  });
});

// ─── buildResumedSessionState ─────────────────────────────────────────────────

describe("buildResumedSessionState", () => {
  const NOW = 50_000;

  it("recalculates endTime from saved timeLeft", () => {
    const prev = { isRunning: false, timeLeft: 120, onBreak: false, started: true, endTime: 0, startTime: 0 };
    const resumed = buildResumedSessionState(prev, NOW);
    expect(resumed.isRunning).toBe(true);
    expect(resumed.startTime).toBe(NOW);
    expect(resumed.endTime).toBe(NOW + 120 * 1000);
  });

  it("preserves onBreak from the previous state", () => {
    const prev = { isRunning: false, timeLeft: 60, onBreak: true, started: true, endTime: 0, startTime: 0 };
    expect(buildResumedSessionState(prev, NOW).onBreak).toBe(true);
  });

  it("preserves task label from the previous state", () => {
    const prev = { isRunning: false, timeLeft: 60, task: "Deep work", endTime: 0, startTime: 0 };
    expect(buildResumedSessionState(prev, NOW).task).toBe("Deep work");
  });
});

// ─── Pause → resume round trip ────────────────────────────────────────────────

describe("pause → resume round trip", () => {
  it("resuming after a pause preserves the correct remaining time", () => {
    // Start a 25-minute work session at t=0
    const session = buildFocusSessionState({
      workDuration: 25 * 60,
      breakDuration: 5 * 60,
      onBreak: false,
      now: 0,
    });

    // 5 minutes pass, then the user pauses — 20 minutes should remain
    const PAUSED_AT = 5 * 60 * 1000;
    const timeLeft = computeTimeLeft(session, PAUSED_AT);
    expect(timeLeft).toBe(20 * 60);

    const paused = { ...session, isRunning: false, timeLeft };

    // 2 minutes later the user resumes — endTime should be 20 minutes from now
    const RESUMED_AT = PAUSED_AT + 2 * 60 * 1000;
    const resumed = buildResumedSessionState(paused, RESUMED_AT);

    expect(resumed.isRunning).toBe(true);
    expect(resumed.endTime).toBe(RESUMED_AT + 20 * 60 * 1000);
  });
});
