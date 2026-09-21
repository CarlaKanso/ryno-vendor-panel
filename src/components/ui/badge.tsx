import { cn } from "@/lib/cn";
import type { OrderStatus } from "@/lib/api/types";
import { ORDER_STATUS_STYLES, statusLabel } from "@/lib/status";

export function StatusBadge({
  status,
  className,
  withDot = true,
}: {
  status: OrderStatus | string;
  className?: string;
  withDot?: boolean;
}) {
  const style = ORDER_STATUS_STYLES[status as OrderStatus];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        style?.badge ?? "bg-ink-100 text-ink-700 ring-ink-200",
        className,
      )}
    >
      {withDot ? (
        <span
          className={cn("size-1.5 rounded-full", style?.dot ?? "bg-ink-400")}
          aria-hidden
        />
      ) : null}
      {statusLabel(status)}
    </span>
  );
}

export function Tag({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "gold" | "green" | "red";
  className?: string;
}) {
  const tones = {
    neutral: "bg-ink-100 text-ink-700 ring-ink-200",
    gold: "bg-gold-100 text-gold-800 ring-gold-300",
    green: "bg-ryno-50 text-ryno-700 ring-ryno-200",
    red: "bg-red-50 text-red-700 ring-red-200",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
