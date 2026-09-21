/**
 * URL state.
 *
 * Filters, search, sort and page live in the query string, so any view can be
 * shared, bookmarked or refreshed. This module is the only place that knows
 * the parameter names, and it is shared by the Server Components that read
 * them and the Client Components that write them.
 */

import { ORDER_STATUSES, type OrderStatus } from "./api/types";
import { lastNDays, parseDateKey, type Granularity } from "./dates";

export type SearchParams = Record<string, string | string[] | undefined>;

export function readString(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  const single = Array.isArray(value) ? value[0] : value;
  const trimmed = single?.trim();
  return trimmed ? trimmed : undefined;
}

export function readInt(
  params: SearchParams,
  key: string,
  fallback: number,
  { min = 1, max = Number.MAX_SAFE_INTEGER }: { min?: number; max?: number } = {},
): number {
  const raw = readString(params, key);
  const parsed = raw === undefined ? Number.NaN : Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

export function readDateKey(params: SearchParams, key: string): string | undefined {
  const raw = readString(params, key);
  return raw && parseDateKey(raw) ? raw : undefined;
}

export function readEnum<T extends string>(
  params: SearchParams,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = readString(params, key);
  return allowed.includes(raw as T) ? (raw as T) : fallback;
}

export const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

export function readPerPage(params: SearchParams, fallback = 10): number {
  const value = readInt(params, "per_page", fallback);
  return (PER_PAGE_OPTIONS as readonly number[]).includes(value) ? value : fallback;
}

export function readStatuses(params: SearchParams): OrderStatus[] {
  const raw = readString(params, "status");
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is OrderStatus =>
      (ORDER_STATUSES as readonly string[]).includes(value),
    );
}

export const ARCHIVED_MODES = ["exclude", "include", "only"] as const;

export const ORDER_SORTS = [
  "-created_at",
  "created_at",
  "-total",
  "total",
  "-order_no",
  "order_no",
] as const;

export const REVIEW_SORTS = ["-created_at", "created_at", "-rating", "rating"] as const;

export const GRANULARITIES = ["daily", "weekly", "monthly"] as const;

export function readGranularity(
  params: SearchParams,
  fallback: Granularity,
): Granularity {
  return readEnum(params, "granularity", GRANULARITIES, fallback);
}

/**
 * The dashboard date window: whatever is in the URL, falling back to the last
 * 30 days. `today` is passed in rather than read from the clock so the caller
 * decides what "now" means.
 */
export function readDateRange(
  params: SearchParams,
  today: Date,
  defaultDays = 30,
): { from: string; to: string } {
  const fallback = lastNDays(defaultDays, today);
  const from = readDateKey(params, "from") ?? fallback.from;
  const to = readDateKey(params, "to") ?? fallback.to;
  // A backwards range is a typo, not an intent; swap rather than show nothing.
  return from <= to ? { from, to } : { from: to, to: from };
}

/**
 * Builds the next query string from the current one.
 * `null` removes a key; changing any filter resets pagination to page 1.
 */
export function buildQuery(
  current: URLSearchParams | SearchParams,
  updates: Record<string, string | number | null | undefined>,
  { resetPage = true }: { resetPage?: boolean } = {},
): string {
  const next =
    current instanceof URLSearchParams
      ? new URLSearchParams(current)
      : new URLSearchParams(
          Object.entries(current).flatMap(([key, value]) =>
            value === undefined
              ? []
              : Array.isArray(value)
                ? value.map((v) => [key, v] as [string, string])
                : [[key, value] as [string, string]],
          ),
        );

  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, String(value));
  }

  if (resetPage && !("page" in updates)) next.delete("page");

  const qs = next.toString();
  return qs ? `?${qs}` : "";
}
