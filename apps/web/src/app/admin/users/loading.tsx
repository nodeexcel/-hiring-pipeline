import { FormCardSkeleton, HeaderSkeleton, LoadingFrame, TableSkeleton } from "@/components/admin/skeletons";

export default function UsersLoading() {
  return (
    <LoadingFrame className="max-w-3xl">
      <HeaderSkeleton />
      <FormCardSkeleton fields={2} />
      <TableSkeleton rows={4} cols={3} />
    </LoadingFrame>
  );
}
