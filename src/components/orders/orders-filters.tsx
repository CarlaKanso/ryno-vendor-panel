"use client";

import { Archive, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Select, TextInput } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { ORDER_STATUSES, type OrderStatus, type Shop } from "@/lib/api/types";
import { ORDER_STATUS_STYLES } from "@/lib/status";
import { buildQuery } from "@/lib/search-params";

/**
 * Order List filters: shop, date range, status and a free-text search.
 *
 * The status filter is a row of toggles rather than a multi-select — a vendor
 * working a queue wants "show me pending and accepted" in one click, and the
 * chips make the current selection visible without opening anything.
 */
export function OrdersFilters({
  shops,
  archivedOnly,
}: {
  shops: Shop[];
  archivedOnly: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [draft, setDraft] = useState(() => readDraft(searchParams));

  // Back/forward navigation changes the URL without remounting this form, so
  // the draft is re-derived during render when the query string changes —
  // React's sanctioned alternative to syncing state inside an effect.
  const queryKey = searchParams.toString();
  const [lastQueryKey, setLastQueryKey] = useState(queryKey);
  if (lastQueryKey !== queryKey) {
    setLastQueryKey(queryKey);
    setDraft(readDraft(searchParams));
  }

  const push = (updates: Record<string, string | number | null>) => {
    startTransition(() =>
      router.push(`${pathname}${buildQuery(searchParams, updates)}`),
    );
  };

  const apply = () =>
    push({
      shop_id: draft.shop || null,
      from: draft.from || null,
      to: draft.to || null,
      status: draft.statuses.length ? draft.statuses.join(",") : null,
      q: draft.q.trim() || null,
    });

  const toggleStatus = (status: OrderStatus) => {
    setDraft((previous) => ({
      ...previous,
      statuses: previous.statuses.includes(status)
        ? previous.statuses.filter((value) => value !== status)
        : [...previous.statuses, status],
    }));
  };

  return (
    <form
      className="rounded-card border border-ink-200/80 bg-white p-4 shadow-card"
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-ink-700">
          <SlidersHorizontal className="size-4 text-ryno-600" aria-hidden />
          Filters
        </span>

        {/* Archived orders are a different working set, not another filter
            value, so the toggle sits apart from the rest. */}
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-600">
          <input
            type="checkbox"
            className="size-4 rounded border-ink-300 text-ryno-600 focus:ring-ryno-600/30"
            checked={archivedOnly}
            onChange={(event) =>
              push({ archived: event.target.checked ? "only" : null })
            }
          />
          <Archive className="size-4" aria-hidden />
          Show archived orders
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Shop" htmlFor="order-shop">
          <Select
            id="order-shop"
            value={draft.shop}
            onChange={(event) => setDraft({ ...draft, shop: event.target.value })}
          >
            <option value="">All Shops</option>
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
                {shop.is_active ? "" : " (closed)"}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="From" htmlFor="order-from">
          <TextInput
            id="order-from"
            type="date"
            value={draft.from}
            max={draft.to || undefined}
            onChange={(event) => setDraft({ ...draft, from: event.target.value })}
          />
        </Field>

        <Field label="To" htmlFor="order-to">
          <TextInput
            id="order-to"
            type="date"
            value={draft.to}
            min={draft.from || undefined}
            onChange={(event) => setDraft({ ...draft, to: event.target.value })}
          />
        </Field>

        <Field
          label="Search"
          htmlFor="order-search"
          hint="Order number, customer name or email, driver name"
        >
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
              aria-hidden
            />
            <TextInput
              id="order-search"
              type="search"
              className="pl-9"
              placeholder="e.g. 42910567 or Afia"
              value={draft.q}
              onChange={(event) => setDraft({ ...draft, q: event.target.value })}
            />
          </div>
        </Field>
      </div>

      <fieldset className="mt-4">
        <legend className="mb-2 text-xs font-medium text-ink-600">Status</legend>
        <div className="flex flex-wrap gap-2">
          {ORDER_STATUSES.map((status) => {
            const selected = draft.statuses.includes(status);
            return (
              <button
                key={status}
                type="button"
                onClick={() => toggleStatus(status)}
                aria-pressed={selected}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-all",
                  selected
                    ? ORDER_STATUS_STYLES[status].badge
                    : "bg-white text-ink-500 ring-ink-200 hover:bg-ink-50 hover:text-ink-700",
                )}
              >
                {ORDER_STATUS_STYLES[status].label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => startTransition(() => router.push(pathname))}
          icon={<RotateCcw className="size-4" aria-hidden />}
        >
          Reset
        </Button>
        <Button type="submit" variant="primary" loading={pending}>
          Apply filters
        </Button>
      </div>
    </form>
  );
}

function readDraft(searchParams: URLSearchParams) {
  const status = searchParams.get("status");
  return {
    shop: searchParams.get("shop_id") ?? "",
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    q: searchParams.get("q") ?? "",
    statuses: (status ? status.split(",") : []).filter(
      (value): value is OrderStatus =>
        (ORDER_STATUSES as readonly string[]).includes(value),
    ),
  };
}
