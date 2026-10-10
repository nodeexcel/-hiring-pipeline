import { ChartSkeleton, HeaderSkeleton, LoadingFrame, StatRowSkeleton } from "@/components/admin/skeletons";

export default function ReportsLoading() {
  return (
    <LoadingFrame>
      <HeaderSkeleton />
      <StatRowSkeleton count={3} className="sm:grid-cols-3" />
      <ChartSkeleton />
      <ChartSkeleton height={280} />
    </LoadingFrame>
  );
}
