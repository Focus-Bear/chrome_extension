/** Compute when (ms since epoch) an unfocus session expires. Duration is in minutes. */
export function computeUnfocusEndTime(unfocusStart: number, unfocusDurationMinutes: number): number {
  return unfocusStart + unfocusDurationMinutes * 60 * 1000;
}

/** True if the unfocus session has not yet expired. */
export function isUnfocusSessionActive(endTime: number, now?: number): boolean {
  return (now ?? Date.now()) < endTime;
}
