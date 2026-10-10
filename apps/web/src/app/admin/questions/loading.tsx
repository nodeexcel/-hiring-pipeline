import { HeaderSkeleton, LoadingFrame } from "@/components/admin/skeletons";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the real page: bank tabs, topic overview cards, the filtered list, then the add form. */
export default function QuestionsLoading() {
  return (
    <LoadingFrame>
      <HeaderSkeleton />

      <div className="flex flex-wrap gap-2">
        {[44, 52, 44].map((w, i) => (
          <Skeleton key={i} className="h-10 rounded-full" style={{ width: `${w * 4}px` }} />
        ))}
      </div>

      <Card>
        <CardBody className="gap-4 p-5">
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-72 max-w-full" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="space-y-3 rounded-xl border border-card-edge p-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[88, 120, 72, 104, 96, 80].map((w, j) => (
                    <Skeleton key={j} className="h-6 rounded-full" style={{ width: `${w}px` }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="gap-4 p-5">
          <div className="space-y-2">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-7 w-14 rounded-full" />
            <Skeleton className="h-7 w-14 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-2 border-t border-card-edge pt-3">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-14" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </CardBody>
      </Card>
    </LoadingFrame>
  );
}
