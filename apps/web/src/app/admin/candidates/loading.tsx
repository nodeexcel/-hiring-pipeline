import { FormCardSkeleton, HeaderSkeleton, LoadingFrame, StatRowSkeleton, TableSkeleton } from "@/components/admin/skeletons";

export default function CandidatesLoading() {
  return (
    <LoadingFrame className="space-y-0">
      <HeaderSkeleton />
      <StatRowSkeleton count={7} className="mb-8 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7" />
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <FormCardSkeleton fields={2} />
        <FormCardSkeleton fields={1} />
      </div>
      <TableSkeleton rows={8} cols={6} />
    </LoadingFrame>
  );
}
