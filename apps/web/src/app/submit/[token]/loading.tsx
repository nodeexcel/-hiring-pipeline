import { Skeleton } from "@/components/ui/skeleton";

export default function SubmitLoading() {
  return (
    <main role="status" aria-busy="true" className="mx-auto max-w-xl space-y-6 p-6 pt-24 sm:pt-32">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-9 w-3/4" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-28" />
    </main>
  );
}
