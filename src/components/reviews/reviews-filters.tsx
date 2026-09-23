"use client";

import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Select, TextInput } from "@/components/ui/field";
import type { Shop } from "@/lib/api/types";
import { buildQuery } from "@/lib/search-params";

export function ReviewsFilters({ shops }: { shops: Shop[] }) {
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

  const apply = () => {
    const query = buildQuery(searchParams, {
      shop_id: draft.shop || null,
      rating: draft.rating || null,
      has_reply: draft.hasReply || null,
      from: draft.from || null,
      to: draft.to || null,
      q: draft.q.trim() || null,
    });
    startTransition(() => router.push(`${pathname}${query}`));
  };

  // Clear the form as well as the URL. Navigating alone is not enough: if the
  // user changed a control but never pressed Apply, the URL is already clean,
  // the query string doesn't change, and the derive-above never fires — so the
  // form would keep the selections Reset just promised to drop.
  const reset = () => {
    setDraft(BLANK_DRAFT);
    startTransition(() => router.push(pathname));
  };

  return (
    <form
      className="rounded-card border border-ink-200/80 bg-white p-4 shadow-card"
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-700">
        <SlidersHorizontal className="size-4 text-ryno-600" aria-hidden />
        Filters
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Field label="Shop" htmlFor="review-shop" className="xl:col-span-2">
          <Select
            id="review-shop"
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

        <Field label="Rating" htmlFor="review-rating">
          <Select
            id="review-rating"
            value={draft.rating}
            onChange={(event) => setDraft({ ...draft, rating: event.target.value })}
          >
            <option value="">Any rating</option>
            {[5, 4, 3, 2, 1].map((rating) => (
              <option key={rating} value={rating}>
                {rating} star{rating === 1 ? "" : "s"}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Reply" htmlFor="review-reply">
          <Select
            id="review-reply"
            value={draft.hasReply}
            onChange={(event) => setDraft({ ...draft, hasReply: event.target.value })}
          >
            <option value="">All reviews</option>
            <option value="true">Replied</option>
            <option value="false">Not replied</option>
          </Select>
        </Field>

        <Field label="From" htmlFor="review-from">
          <TextInput
            id="review-from"
            type="date"
            value={draft.from}
            max={draft.to || undefined}
            onChange={(event) => setDraft({ ...draft, from: event.target.value })}
          />
        </Field>

        <Field label="To" htmlFor="review-to">
          <TextInput
            id="review-to"
            type="date"
            value={draft.to}
            min={draft.from || undefined}
            onChange={(event) => setDraft({ ...draft, to: event.target.value })}
          />
        </Field>

        <Field
          label="Search"
          htmlFor="review-search"
          className="sm:col-span-2 xl:col-span-6"
          hint="Customer name, order number or the review text"
        >
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
              aria-hidden
            />
            <TextInput
              id="review-search"
              type="search"
              className="pl-9"
              placeholder="e.g. rider was polite"
              value={draft.q}
              onChange={(event) => setDraft({ ...draft, q: event.target.value })}
            />
          </div>
        </Field>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={reset}
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

/** The state Reset returns to. */
const BLANK_DRAFT = {
  shop: "",
  rating: "",
  hasReply: "",
  from: "",
  to: "",
  q: "",
};

function readDraft(searchParams: URLSearchParams) {
  return {
    shop: searchParams.get("shop_id") ?? "",
    rating: searchParams.get("rating") ?? "",
    hasReply: searchParams.get("has_reply") ?? "",
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    q: searchParams.get("q") ?? "",
  };
}
