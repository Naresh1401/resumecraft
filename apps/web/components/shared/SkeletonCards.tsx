import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border p-4 space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-20 w-full" />
        </div>
      ))}
    </div>
  );
}
