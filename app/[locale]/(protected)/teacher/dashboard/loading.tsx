import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Route-level Suspense fallback for `/teacher/dashboard` — Next.js renders
 * this automatically while the server component above streams in.
 * Mirrors the real layout (heading, 5 stat cards, schedule + form) so the
 * page doesn't jump around once data lands.
 */
export default function TeacherDashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 border-s-4 border-border ps-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Card key={index} className="min-h-36">
            <CardHeader className="mb-5 flex-row items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-2 h-3 w-56" />
          </div>
          <div className="flex flex-col items-center gap-4 px-6 py-16">
            <Skeleton className="h-40 w-full max-w-xs" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
        </div>

        <Card className="p-0">
          <CardContent className="flex flex-col gap-3 p-5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48" />
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
            <Skeleton className="mt-1 h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
