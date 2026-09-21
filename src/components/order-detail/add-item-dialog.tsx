"use client";

import { PackageSearch, Search } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { searchItems } from "@/actions/catalog";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { TextInput } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { Item } from "@/lib/api/types";
import { formatMoney } from "@/lib/money";

/**
 * The substitute-item picker.
 *
 * Search is debounced and every response carries the query it answered, so a
 * slow early request can't overwrite the results of a later one — the classic
 * type-ahead race.
 */
export function AddItemDialog({
  open,
  onClose,
  onAdd,
  loading,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (itemId: string, quantity: number) => void;
  loading: boolean;
  currency: string;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Item | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Clear the previous session's draft when the dialog opens. Derived during
  // render because the dialog stays mounted while closed.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setQuery("");
      setSelected(null);
      setQuantity(1);
      setError(null);
      setSearching(true);
    }
  }

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      const result = await searchItems(query);
      // `cancelled` is the type-ahead guard: a slow early request must not
      // overwrite the results of a later, faster one.
      if (cancelled) return;

      if (result.ok) {
        setItems(result.items);
        setError(null);
      } else {
        setError(result.message);
      }
      setSearching(false);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, open]);

  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      title="Add a substitute item"
      description="Pick a replacement for something the picker couldn't find. It is added to this order and marked as a substitution."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!selected}
            loading={loading}
            onClick={() => selected && onAdd(selected.id, quantity)}
          >
            Add to order
          </Button>
        </>
      }
    >
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
          aria-hidden
        />
        <TextInput
          type="search"
          className="pl-9"
          placeholder="Search by name, SKU or barcode"
          value={query}
          aria-label="Search products"
          onChange={(event) => {
            setQuery(event.target.value);
            setSearching(true);
          }}
        />
      </div>

      <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto scrollbar-thin pr-1">
        {searching && items.length === 0 ? (
          Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))
        ) : error ? (
          <p className="py-6 text-center text-sm text-red-600">{error}</p>
        ) : items.length === 0 ? (
          <div className="py-8 text-center">
            <PackageSearch className="mx-auto size-7 text-ink-300" aria-hidden />
            <p className="mt-2 text-sm text-ink-500">
              No active products match “{query}”.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const isSelected = selected?.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item)}
                aria-pressed={isSelected}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                  isSelected
                    ? "border-ryno-600 bg-ryno-50"
                    : "border-ink-200 hover:border-ink-300 hover:bg-ink-50",
                )}
              >
                <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md bg-ink-100">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt=""
                      width={40}
                      height={40}
                      className="size-full object-cover"
                      unoptimized
                    />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink-900">
                    {item.name}
                  </span>
                  <span className="block truncate text-xs text-ink-500">
                    {item.sku ?? "—"}
                    {item.barcode ? ` · ${item.barcode}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-ink-900 tabular">
                  {formatMoney(item.price, currency)}
                </span>
              </button>
            );
          })
        )}
      </div>

      {selected ? (
        <div className="mt-4 flex items-end gap-3 rounded-lg bg-ink-50 p-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-500">Selected</p>
            <p className="truncate text-sm font-medium text-ink-900">{selected.name}</p>
          </div>
          <div className="w-24">
            <label
              htmlFor="substitute-quantity"
              className="mb-1 block text-xs font-medium text-ink-600"
            >
              Quantity
            </label>
            <TextInput
              id="substitute-quantity"
              type="number"
              min={1}
              max={99}
              value={quantity}
              onChange={(event) =>
                setQuantity(Math.max(1, Math.min(99, Number(event.target.value) || 1)))
              }
            />
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
