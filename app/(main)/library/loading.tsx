import { Skeleton } from "@/components/ui/skeleton";

export default function LibraryLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-5">
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="flex gap-3">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      {/* Upload Zone Skeleton */}
      <Skeleton className="h-32 w-full rounded-2xl" />

      {/* Toolbar Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
        </div>
        <Skeleton className="h-9 w-64 rounded-lg" />
      </div>

      {/* Grid Skeleton */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
             <Skeleton className="h-6 w-32" />
             <Skeleton className="h-4 w-16" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[2/3] w-full rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
