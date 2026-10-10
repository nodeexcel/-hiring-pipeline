/**
 * The test clock. Pure, with every reading injected, so it is unit tested without a phone.
 *
 * Two clocks are read, and a segment's elapsed time is the LARGER of their deltas:
 *   - monotonic (performance.now): immune to the user changing the date and time, but on
 *     Android it can stand still while the phone is asleep;
 *   - wall clock (Date.now): keeps running through sleep, but the user can change it.
 *
 * Taking the max closes both holes: moving the wall clock back cannot help (the monotonic
 * delta still counts), sleeping cannot pause the timer (the wall delta still counts), and moving
 * the wall clock forward only costs the candidate their own time.
 */
export interface Clock {
  /** Time already used before this segment (restored after a restart). */
  baseMs: number;
  /** Monotonic reading when this segment started. */
  monoStart: number;
  /** Wall clock (epoch ms) when this segment started. */
  wallStart: number;
}

export const startClock = (baseMs: number, mono: number, wall: number): Clock => ({
  baseMs: Math.max(0, baseMs),
  monoStart: mono,
  wallStart: wall,
});

export const elapsedMs = (c: Clock, mono: number, wall: number): number =>
  c.baseMs + Math.max(0, mono - c.monoStart, wall - c.wallStart);

export const remainingMs = (limitMs: number, c: Clock, mono: number, wall: number): number =>
  Math.max(0, limitMs - elapsedMs(c, mono, wall));

export const isExpired = (limitMs: number, c: Clock, mono: number, wall: number): boolean =>
  remainingMs(limitMs, c, mono, wall) === 0;

/**
 * Time already used when the app comes back after being closed or killed. The time it spent
 * closed counts (the rules say closing the app does not stop the timer). A clock moved
 * backwards adds nothing; it never subtracts.
 */
export const resumedBaseMs = (savedElapsedMs: number, savedAtWall: number, nowWall: number): number =>
  Math.max(0, savedElapsedMs) + Math.max(0, nowWall - savedAtWall);

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
