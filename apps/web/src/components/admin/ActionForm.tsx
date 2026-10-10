"use client";
import { useActionState, type ReactNode } from "react";
import { initialState, type ActionState } from "@/lib/action-state";
import { cn } from "@/lib/utils";

/**
 * A form bound to a Server Action using useActionState, so validation and server errors
 * render inline without a page reload. Works without JavaScript too (progressive
 * enhancement), because the action is a real form action.
 */
export function ActionForm({
  action,
  className,
  children,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  className?: string;
  children: ReactNode;
}) {
  const [state, formAction] = useActionState(action, initialState);
  return (
    <form action={formAction} className={className}>
      {children}
      {state.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={cn("text-sm", state.ok ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400")}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
