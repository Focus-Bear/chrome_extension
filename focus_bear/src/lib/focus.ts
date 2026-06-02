export type FocusSessionState = {
  started?: boolean;
  onBreak?: boolean;
  isRunning?: boolean;
  workDuration?: number;
  breakDuration?: number;
  startTime?: number;
  endTime?: number;
  timeLeft?: number;
  task?: string;
};

/** True only when a focus session is actively running — not on break, not paused, not absent. */
export function isFocusActive(state: FocusSessionState | undefined): boolean {
  return !!(state && state.started === true && state.onBreak !== true);
}

/** Build the initial state object when starting a new focus session. */
export function buildFocusSessionState(params: {
  workDuration: number;
  breakDuration: number;
  onBreak: boolean;
  task?: string;
  now?: number;
}): FocusSessionState {
  const now = params.now ?? Date.now();
  const duration = params.onBreak ? params.breakDuration : params.workDuration;
  return {
    task: params.task ?? "",
    workDuration: params.workDuration,
    breakDuration: params.breakDuration,
    startTime: now,
    endTime: now + duration * 1000,
    isRunning: true,
    onBreak: params.onBreak,
    started: true,
  };
}

/** Compute remaining seconds to snapshot when pausing a session. */
export function computeTimeLeft(state: FocusSessionState, now?: number): number {
  return Math.max(Math.floor(((state.endTime ?? 0) - (now ?? Date.now())) / 1000), 0);
}

/** Build the updated state when resuming a previously paused session. */
export function buildResumedSessionState(prev: FocusSessionState, now?: number): FocusSessionState {
  const t = now ?? Date.now();
  const endTime = t + (prev.timeLeft ?? 0) * 1000;
  return { ...prev, startTime: t, endTime, isRunning: true };
}
