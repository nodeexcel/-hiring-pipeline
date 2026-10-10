import { HeaderSkeleton, LoadingFrame, SectionSkeleton } from "@/components/admin/skeletons";

export default function SettingsLoading() {
  return (
    <LoadingFrame className="max-w-3xl">
      <HeaderSkeleton />
      <SectionSkeleton lines={4} />
      <SectionSkeleton lines={5} />
      <SectionSkeleton lines={4} />
    </LoadingFrame>
  );
}
