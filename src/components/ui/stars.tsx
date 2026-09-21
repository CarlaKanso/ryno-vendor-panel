import { Star } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * The numeric rating is in the accessible name; the stars themselves are
 * decorative, so a screen reader hears "Rated 4 out of 5" instead of five
 * separate icons.
 */
export function Stars({
  rating,
  size = 14,
  className,
  showValue = false,
}: {
  rating: number;
  size?: number;
  className?: string;
  showValue?: boolean;
}) {
  const rounded = Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span
        className="inline-flex items-center gap-0.5"
        role="img"
        aria-label={`Rated ${rating} out of 5`}
      >
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            width={size}
            height={size}
            aria-hidden
            className={cn(
              index < rounded ? "fill-gold-400 text-gold-400" : "fill-ink-200 text-ink-200",
            )}
          />
        ))}
      </span>
      {showValue ? (
        <span className="text-xs font-medium text-ink-600 tabular">{rating.toFixed(1)}</span>
      ) : null}
    </span>
  );
}
