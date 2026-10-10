import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A labelled form control. The control sits inside the <label>, which associates
 * them without ids or cloning children. Hook-free, so it works in Server Components.
 * Wrap exactly one control.
 */
export function FormField({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="block text-sm font-medium">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-muted-foreground">{hint}</span>}
      {error && (
        <span role="alert" className="block text-xs text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </label>
  );
}
