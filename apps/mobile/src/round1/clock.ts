/**
 * A monotonic test clock. `now` is injected (performance.now in the app), never Date, so
 * changing the phone's wall clock cannot give a candidate more time. Pure and unit tested.
 */
export interface Clock {
  /** Time already used before this run segment (restored after a restart). */
  baseMs: number;
  /** Monotonic reading when this segment started. */
  segmentStart: number;
}

export const startClock = (baseMs: number, now: number): Clock => ({ baseMs: Math.max(0, baseMs), segmentStart: now });

export const elapsedMs = (c: Clock, now: number): number => c.baseMs + Math.max(0, now - c.segmentStart);

export const remainingMs = (limitMs: number, c: Clock, now: number): number => Math.max(0, limitMs - elapsedMs(c, now));

export const isExpired = (limitMs: number, c: Clock, now: number): boolean => remainingMs(limitMs, c, now) === 0;

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
