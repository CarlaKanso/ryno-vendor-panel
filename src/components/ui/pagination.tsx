"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/money";
import { buildQuery, PER_PAGE_OPTIONS } from "@/lib/search-params";

/**
 * Pagination and the "show entries" selector.
 *
 * Every control is a real `<Link>` to a URL, which is what makes a filtered,
 * sorted page 7 shareable — and gives keyboard users and middle-click the
 * behaviour they expect for free.
 */

/** A compact window of page numbers with ellipses: 1 … 6 7 8 … 70. */
function pageWindow(current: number, total: number): Array<number | "gap"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current]);
  for (const offset of [-1, 1]) {
    const page = current + offset;
    if (page > 1 && page < total) pages.add(page);
  }
  // Keep the window a constant width near the ends so it does not jitter.
  if (current <= 3) [2, 3, 4].forEach((p) => p < total && pages.add(p));
  if (current >= total - 2)
    [total - 3, total - 2, total - 1].forEach((p) => p > 1 && pages.add(p));

  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const result: Array<number | "gap"> = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) result.push("gap");
    result.push(page);
    previous = page;
  }
  return result;
}

export function Pagination({
  page,
  perPage,
  total,
  totalPages,
  itemLabel = "entries",
}: {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  itemLabel?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const href = (updates: Record<string, string | number | null>) =>
    `${pathname}${buildQuery(searchParams, updates, { resetPage: false })}`;

  const firstRow = total === 0 ? 0 : (page - 1) * perPage + 1;
  const lastRow = Math.min(page * perPage, total);

  const navButton =
    "inline-flex size-8 items-center justify-center rounded-md border border-ink-300 bg-white text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900";
  const navDisabled = "pointer-events-none opacity-40";

  return (
    <div className="flex flex-col gap-3 border-t border-ink-200 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-sm text-ink-600">
          <span>Show</span>
          <select
            className="h-8 rounded-md border border-ink-300 bg-white px-2 text-sm text-ink-900 focus:border-ryno-600 focus:outline-none focus:ring-2 focus:ring-ryno-600/20"
            value={perPage}
            onChange={(event) => {
              // Changing the page size invalidates the current offset, so the
              // `page` param is dropped rather than carried over.
              router.push(
                `${pathname}${buildQuery(searchParams, {
                  per_page: event.target.value,
                  page: null,
                })}`,
              );
            }}
          >
            {PER_PAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span>{itemLabel}</span>
        </label>

        <p className="text-sm text-ink-500 tabular" aria-live="polite">
          Showing {formatCount(firstRow)} to {formatCount(lastRow)} of{" "}
          {formatCount(total)} {itemLabel}
        </p>
      </div>

      <nav className="flex items-center gap-1" aria-label="Pagination">
        <Link
          href={href({ page: 1 })}
          className={cn(navButton, page === 1 && navDisabled)}
          aria-label="First page"
          aria-disabled={page === 1}
        >
          <ChevronsLeft className="size-4" aria-hidden />
        </Link>
        <Link
          href={href({ page: Math.max(1, page - 1) })}
          className={cn(navButton, page === 1 && navDisabled)}
          aria-label="Previous page"
          aria-disabled={page === 1}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Link>

        {pageWindow(page, Math.max(totalPages, 1)).map((entry, index) =>
          entry === "gap" ? (
            <span key={`gap-${index}`} className="px-1 text-sm text-ink-400">
              …
            </span>
          ) : (
            <Link
              key={entry}
              href={href({ page: entry })}
              aria-current={entry === page ? "page" : undefined}
              className={cn(
                "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors tabular",
                entry === page
                  ? "bg-ryno-600 text-white"
                  : "border border-ink-300 bg-white text-ink-700 hover:bg-ink-50",
              )}
            >
              {entry}
            </Link>
          ),
        )}

        <Link
          href={href({ page: Math.min(totalPages, page + 1) })}
          className={cn(navButton, page >= totalPages && navDisabled)}
          aria-label="Next page"
          aria-disabled={page >= totalPages}
        >
          <ChevronRight className="size-4" aria-hidden />
        </Link>
        <Link
          href={href({ page: Math.max(totalPages, 1) })}
          className={cn(navButton, page >= totalPages && navDisabled)}
          aria-label="Last page"
          aria-disabled={page >= totalPages}
        >
          <ChevronsRight className="size-4" aria-hidden />
        </Link>
      </nav>
    </div>
  );
}
