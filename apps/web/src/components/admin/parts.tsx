import type { ReactNode } from "react";
import { Card, CardBody, CardText, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";

const TONE: Record<string, "default" | "success" | "danger" | "special"> = {
  Selected: "success",
  Rejected: "danger",
  "R3 submitted": "special", // the one status that needs a human decision
};

/** Status as an outlined chip: colour is text and a thin stroke, never a fill. */
export function StatusChip({ status }: { status: string }) {
  return <Chip tone={TONE[status] ?? "default"}>{status}</Chip>;
}

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-medium sm:text-3xl">{title}</h1>
        {description && <p className="max-w-2xl text-base text-neutral-600 dark:text-neutral-400">{description}</p>}
      </div>
      {children}
    </header>
  );
}

/*
 * Admin cards hold dense text, tables and forms, so they do not use the ChaiUI listing-card
 * fade (sm:opacity-90). At 90% opacity muted text drops from 4.7:1 to 3.9:1 on a light
 * background, below WCAG AA. Legibility wins; the hairline, fill and hover border are kept.
 */
const NO_FADE = "sm:opacity-100";

/** A titled content block on the warm hairline card. */
export function Section({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn(NO_FADE, className)}>
      <CardBody className="gap-4 p-5">
        <div>
          <CardTitle>{title}</CardTitle>
          {subtitle && <CardText className="mt-1">{subtitle}</CardText>}
        </div>
        {children}
      </CardBody>
    </Card>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className={NO_FADE}>
      <CardBody className="gap-1 p-4">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-montserrat text-2xl font-semibold tabular-nums">{value}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </CardBody>
    </Card>
  );
}

export function Initial({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-montserrat text-xs font-semibold text-muted-foreground ring-1 ring-card-edge",
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
