import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-background px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6">
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
          <Skeleton className="size-11" />
          <div className="grid flex-1 gap-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-7 w-56 max-w-full" /></div>
          <Skeleton className="size-10" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Skeleton className="h-56 rounded-xl" />
          <div className="grid gap-3 rounded-xl border border-border bg-card p-6">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    </main>
  );
}
