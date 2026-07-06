import { Skeleton } from "@/components/ui/skeleton";

export function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    </article>
  );
}

export function StatCardSkeleton() {
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-8 w-32" />
    </article>
  );
}
