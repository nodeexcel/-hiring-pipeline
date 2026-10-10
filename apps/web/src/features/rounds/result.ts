/** A service outcome that route handlers translate into an HTTP response. */
export type Outcome<T> = { ok: true; body: T } | { ok: false; status: number; error: string };

export const ok = <T>(body: T): Outcome<T> => ({ ok: true, body });
export const err = (status: number, error: string): Outcome<never> => ({ ok: false, status, error });
