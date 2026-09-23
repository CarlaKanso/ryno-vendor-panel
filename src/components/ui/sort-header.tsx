"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/cn";
import { buildQuery } from "@/lib/search-params";

/**
 * A sortable column heading.
 *
 * It is a link, not a button: sort is part of the URL like every other bit of
 * list state, so a sorted view survives a refresh and can be pasted to a
 * colleague. Clicking the active column flips the direction.
 */
export function SortHeader({
  label,
  field,
  currentSort,
  align = "left",
  className,
}: {
  label: string;
  /** The API's sort field, e.g. `total` — `-total` is the descending form. */
  field: string;
  currentSort: string;
  align?: "left" | "right";
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isActive = currentSort === field || currentSort === `-${field}`;
  const isDescending = currentSort === `-${field}`;
  // Default to descending on first click: the newest orders and the biggest
  // baskets are what a vendor looks for.
  const nextSort = isActive && isDescending ? field : `-${field}`;

  const Icon = !isActive ? ArrowUpDown : isDescending ? ArrowDown : ArrowUp;

  return (
    <th
      scope="col"
      className={cn("px-3 py-2.5 font-medium", align === "right" && "text-right", className)}
      aria-sort={isActive ? (isDescending ? "descending" : "ascending") : "none"}
    >
      <Link
        href={`${pathname}${buildQuery(searchParams, { sort: nextSort })}`}
        // Keep the reader where they are: they are looking at the column they
        // just clicked, and a re-sort should not also move the page.
        scroll={false}
        className={cn(
          "inline-flex items-center gap-1 rounded transition-colors hover:text-ink-900",
          isActive && "text-ryno-700",
          align === "right" && "flex-row-reverse",
        )}
      >
        {label}
        <Icon className="size-3.5 shrink-0" aria-hidden />
      </Link>
    </th>
  );
}
