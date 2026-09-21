import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Empty and error states both land here. The RYNO mascot does a slow float —
 * enough to make a dead end feel intentional, slow enough not to nag.
 */
export function EmptyState({
  title,
  description,
  action,
  className,
  tone = "empty",
  compact = false,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  tone?: "empty" | "error";
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 text-center",
        compact ? "py-8" : "py-14",
        className,
      )}
    >
      <div className="pop-in relative">
        {/* The mascot floats slowly — enough to make a dead end feel
            intentional, slow enough not to nag. */}
        <div className="float-y">
          <Image
            src="/brand/ryno-mascot.png"
            alt=""
            width={compact ? 72 : 108}
            height={compact ? 72 : 108}
            className={cn("opacity-90", tone === "error" && "grayscale")}
          />
        </div>
        <div
          className="absolute -bottom-1 left-1/2 h-2 w-14 -translate-x-1/2 rounded-[50%] bg-ink-900/10 blur-[3px]"
          aria-hidden
        />
      </div>

      <p className="mt-4 text-sm font-semibold text-ink-800">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
