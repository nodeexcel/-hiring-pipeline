"use client";
import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * A button that asks before submitting its form. The dialog says exactly what will
 * happen and focus starts on Cancel (the safe choice). Used for anything that
 * deletes data or sends a decision email.
 */
export function ConfirmSubmit({
  label,
  title,
  confirmLabel,
  tone = "danger",
  variant = "outline",
  className,
  children,
}: {
  label: string;
  title: string;
  confirmLabel: string;
  tone?: "danger" | "neutral";
  variant?: "soft" | "outline" | "ghost";
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button ref={trigger} type="button" variant={variant} size="sm" className={className} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <ConfirmDialog
        open={open}
        title={title}
        confirmLabel={confirmLabel}
        tone={tone}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          trigger.current?.form?.requestSubmit();
        }}
      >
        {children}
      </ConfirmDialog>
    </>
  );
}
