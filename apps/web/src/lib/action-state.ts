/** The result every form Server Action returns, so forms can render errors inline. */
export type ActionState = { ok: boolean; message?: string };

export const initialState: ActionState = { ok: true };
export const done = (message?: string): ActionState => ({ ok: true, message });
export const failed = (message: string): ActionState => ({ ok: false, message });
