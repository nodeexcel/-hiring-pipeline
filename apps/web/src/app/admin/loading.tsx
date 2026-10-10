import { HeaderSkeleton, LoadingFrame, SectionSkeleton, StatRowSkeleton } from "@/components/admin/skeletons";

/** Generic fallback for any admin route that does not have its own loading file. */
export default function AdminLoading() {
  return (
    <LoadingFrame>
      <HeaderSkeleton />
      <StatRowSkeleton />
      <SectionSkeleton lines={4} />
    </LoadingFrame>
  );
}
