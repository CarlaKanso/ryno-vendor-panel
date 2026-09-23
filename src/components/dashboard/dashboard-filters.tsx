"use client";

import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Select, TextInput } from "@/components/ui/field";
import type { Category, Shop } from "@/lib/api/types";
import type { CategoryTree } from "@/lib/api/vendor";
import { lastNDays } from "@/lib/dates";
import { buildQuery, DEFAULT_RANGE_DAYS } from "@/lib/search-params";

/**
 * The dashboard filter bar.
 *
 * It holds a local draft and only writes to the URL when Apply is pressed —
 * the brief asks for explicit Apply/Reset buttons, and with five controls that
 * is also kinder than re-fetching on every keystroke of a date field.
 *
 * Choosing a Main Category clears Category and Sub Category, because a stale
 * child would silently filter out everything.
 */
export function DashboardFilters({
  shops,
  categories,
  defaultRange,
}: {
  shops: Shop[];
  categories: CategoryTree;
  defaultRange: { from: string; to: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [draft, setDraft] = useState(() => readDraft(searchParams, defaultRange));

  // Back/forward navigation changes the URL without remounting this form, so
  // the draft is re-derived during render when the query string changes —
  // React's sanctioned alternative to syncing state inside an effect.
  const queryKey = searchParams.toString();
  const [lastQueryKey, setLastQueryKey] = useState(queryKey);
  if (lastQueryKey !== queryKey) {
    setLastQueryKey(queryKey);
    setDraft(readDraft(searchParams, defaultRange));
  }

  const categoryOptions = useMemo(
    () => (draft.main ? (categories.byParent[draft.main] ?? []) : []),
    [categories, draft.main],
  );

  const subCategoryOptions = useMemo(
    () => (draft.category ? (categories.byParent[draft.category] ?? []) : []),
    [categories, draft.category],
  );

  const apply = () => {
    const query = buildQuery(searchParams, {
      shop_id: draft.shop || null,
      main_category_id: draft.main || null,
      category_id: draft.category || null,
      sub_category_id: draft.sub || null,
      from: draft.from || null,
      to: draft.to || null,
    });
    startTransition(() => router.push(`${pathname}${query}`));
  };

  const reset = () => {
    // Clear the form as well as the URL. Navigating alone is not enough: if
    // the user changed a control but never pressed Apply, the URL is already
    // clean, the query string doesn't change, and the derive-above never
    // fires — so the form would keep the selections Reset just promised to
    // drop. `new Date()` is safe here because this runs in an event handler,
    // not during render.
    setDraft(blankDraft(new Date()));
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
        <Field label="Shop" htmlFor="filter-shop">
          <Select
            id="filter-shop"
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

        <Field label="Main Category" htmlFor="filter-main">
          <Select
            id="filter-main"
            value={draft.main}
            onChange={(event) =>
              setDraft({ ...draft, main: event.target.value, category: "", sub: "" })
            }
          >
            <option value="">All Main Categories</option>
            {categories.main.map(toOption)}
          </Select>
        </Field>

        <Field label="Category" htmlFor="filter-category">
          <Select
            id="filter-category"
            value={draft.category}
            disabled={!draft.main}
            onChange={(event) =>
              setDraft({ ...draft, category: event.target.value, sub: "" })
            }
          >
            <option value="">
              {draft.main ? "All Categories" : "Select a main category first"}
            </option>
            {categoryOptions.map(toOption)}
          </Select>
        </Field>

        <Field label="Sub Category" htmlFor="filter-sub">
          <Select
            id="filter-sub"
            value={draft.sub}
            disabled={!draft.category}
            onChange={(event) => setDraft({ ...draft, sub: event.target.value })}
          >
            <option value="">
              {draft.category ? "All Sub Categories" : "Select a category first"}
            </option>
            {subCategoryOptions.map(toOption)}
          </Select>
        </Field>

        <Field label="From" htmlFor="filter-from">
          <TextInput
            id="filter-from"
            type="date"
            value={draft.from}
            max={draft.to || undefined}
            onChange={(event) => setDraft({ ...draft, from: event.target.value })}
          />
        </Field>

        <Field label="To" htmlFor="filter-to">
          <TextInput
            id="filter-to"
            type="date"
            value={draft.to}
            min={draft.from || undefined}
            onChange={(event) => setDraft({ ...draft, to: event.target.value })}
          />
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

function toOption(category: Category) {
  return (
    <option key={category.id} value={category.id}>
      {category.name}
    </option>
  );
}

/** The state Reset returns to: no filters, and the default date window. */
function blankDraft(today: Date) {
  const range = lastNDays(DEFAULT_RANGE_DAYS, today);
  return { shop: "", main: "", category: "", sub: "", from: range.from, to: range.to };
}

function readDraft(
  searchParams: URLSearchParams,
  defaultRange: { from: string; to: string },
) {
  return {
    shop: searchParams.get("shop_id") ?? "",
    main: searchParams.get("main_category_id") ?? "",
    category: searchParams.get("category_id") ?? "",
    sub: searchParams.get("sub_category_id") ?? "",
    from: searchParams.get("from") ?? defaultRange.from,
    to: searchParams.get("to") ?? defaultRange.to,
  };
}
