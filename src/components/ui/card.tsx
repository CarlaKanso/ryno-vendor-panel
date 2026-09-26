import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card border border-ink-200/80 bg-white shadow-card",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-ink-200/70 px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-ink-500">{description}</p>
        ) : null}
      </div>
      {/* `flex-wrap` plus no `shrink-0`: `actions` is only ever used with more
          than one control today (Rush Hours' scope toggle beside its colour
          legend), and on a narrow phone that pair is wider than the card.
          `shrink-0` would have held the box at its full unwrapped width no
          matter how little room the line actually had — a flex item told
          never to shrink also never gets squeezed down to the width its own
          `flex-wrap` needs to kick in, so the pair just overflowed the card
          edge instead of dropping to a second line. Letting it shrink is
          exactly what lets it wrap; `min-w-0` on the title is what still
          gives actions first claim on the row's width when both fit on one
          line. `justify-end` keeps a wrapped second line flush with the
          first, on the same side. */}
      {actions ? (
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}
