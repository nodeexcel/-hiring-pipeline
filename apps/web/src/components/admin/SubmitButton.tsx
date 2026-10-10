"use client";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type Props = Omit<React.ComponentProps<typeof Button>, "type" | "disabled"> & { pendingLabel?: string };

/** Disables itself while the surrounding form's action is running, preventing double submits. */
export function SubmitButton({ children, pendingLabel = "Working", ...props }: Props) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-disabled={pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
