import { LoadingFrame, SectionSkeleton, StatRowSkeleton } from "@/components/admin/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function CandidateLoading() {
  return (
    <LoadingFrame>
      <div className="space-y-4">
        <Skeleton className="h-4 w-36" />
        <div className="flex items-center gap-4">
          <Skeleton className="size-11 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-60" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
        </div>
      </div>
      <StatRowSkeleton count={4} className="lg:grid-cols-4" />
      <SectionSkeleton lines={2} />
      <SectionSkeleton lines={5} />
      <SectionSkeleton lines={4} />
    </LoadingFrame>
  );
}
