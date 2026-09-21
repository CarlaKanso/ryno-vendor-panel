import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-shimmer rounded-md bg-ink-200/70", className)}
      aria-hidden
    />
  );
}

/** A table-shaped placeholder, so the page does not jump when rows arrive. */
export function TableSkeleton({
  rows = 8,
  columns = 6,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="space-y-3 p-5" role="status" aria-label="Loading">
      <div className="flex gap-4">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex gap-4">
          {Array.from({ length: columns }, (_, col) => (
            <Skeleton
              key={col}
              className="h-9 flex-1"
              // Slightly different widths read as data rather than as a grid.
            />
          ))}
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-card border border-ink-200/80 bg-white p-5 shadow-card",
        className,
      )}
      role="status"
      aria-label="Loading"
    >
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-4 h-8 w-36" />
      <Skeleton className="mt-3 h-3 w-20" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
