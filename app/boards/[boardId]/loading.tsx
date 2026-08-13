import { Skeleton } from "@/components/ui/skeleton";

export default function BoardLoading() {
  return (
    <main className="min-h-screen bg-background px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-5 grid gap-3 rounded-xl border border-border bg-card p-6">
          <Skeleton className="size-10" />
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[0, 1, 2, 3].map((column) => (
            <div key={column} className="w-[340px] min-w-[340px] rounded-xl border border-border bg-card p-4">
              <Skeleton className="mb-5 h-5 w-32" />
              <div className="grid gap-3"><Skeleton className="h-28" /><Skeleton className="h-36" /><Skeleton className="h-24" /></div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
