import type { FlagEvent } from "./types";

const MAX_EVENTS = 200; // the server accepts at most 200 per request
const DEDUPE_WINDOW_MS = 1500;

/**
 * Appends an event, collapsing a burst of identical ones (a flaky connection can fire many
 * `internet_on` events in a second) and capping the queue. Returns a new array.
 */
export function pushEvent(queue: readonly FlagEvent[], event: FlagEvent): FlagEvent[] {
  const last = queue[queue.length - 1];
  if (last && last.type === event.type && Math.abs(Date.parse(event.at) - Date.parse(last.at)) < DEDUPE_WINDOW_MS) {
    return [...queue];
  }
  const next = [...queue, event];
  return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next;
}

export const makeEvent = (type: string, detail?: unknown, at = new Date().toISOString()): FlagEvent => ({ type, detail, at });
