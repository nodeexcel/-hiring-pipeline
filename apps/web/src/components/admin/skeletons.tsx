import type { ReactNode } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Loading placeholders shaped like the real UI, so nothing jumps when data arrives.
 * Built from the registry Skeleton, which is aria-hidden and honours reduced motion.
 */

/** Announces loading once to assistive tech, while the blocks inside stay hidden from it. */
export function LoadingFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={cn("space-y-6", className)}>
      <span className="sr-only">Loading</span>
      {children}
    </div>
  );
}

export function HeaderSkeleton({ withDescription = true }: { withDescription?: boolean }) {
  return (
    <div className="mb-8 space-y-3 sm:mb-10">
      <Skeleton className="h-8 w-56 sm:h-9" />
      {withDescription && <Skeleton className="h-4 w-80 max-w-full" />}
    </div>
  );
}

export function StatRowSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i}>
          <CardBody className="gap-2 p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-12" />
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export function FormCardSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <Card>
      <CardBody className="gap-4 p-5">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56 max-w-full" />
        </div>
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <Skeleton className="h-9 w-36" />
      </CardBody>
    </Card>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-card-edge bg-card-fill">
      <div className="flex gap-4 border-b border-card-edge px-4 py-3.5">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-card-edge px-4 py-3 last:border-0">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className={cn("h-4 flex-1", c === 0 && "h-8")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SectionSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Card>
      <CardBody className="gap-3 p-5">
        <Skeleton className="h-5 w-48" />
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")} />
        ))}
      </CardBody>
    </Card>
  );
}

export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <Card>
      <CardBody className="gap-4 p-5">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="w-full" style={{ height }} />
      </CardBody>
    </Card>
  );
}
