"use client";

import { Check, Search, UserRoundX } from "lucide-react";
import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TextInput } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { Person } from "@/lib/api/types";

/**
 * The driver picker.
 *
 * This was a native `<select>`, which the OS renders in its own chrome — a
 * 22-item scrolling list with no search, looking nothing like the rest of the
 * panel. Assigning a driver is a decision ("who is near Nungua?"), not a
 * setting, so it gets the same shape as the substitute-item picker: a search
 * box over a list of rows carrying the detail you actually choose on.
 *
 * The filter bars keep their native selects on purpose — a short list in a
 * dense toolbar is exactly what `<select>` is good at, and it brings keyboard
 * and mobile behaviour for free. The difference here is list length and the
 * weight of the decision.
 */
export function AssignDriverDialog({
  open,
  onClose,
  onAssign,
  drivers,
  currentDriverId,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onAssign: (driverId: string) => void;
  drivers: Person[];
  currentDriverId: string | null;
  loading: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(currentDriverId);

  // Reset when the dialog opens — it stays mounted while closed.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setQuery("");
      setSelected(currentDriverId);
    }
  }

  // 22 active drivers arrive with the page, so this filters in the browser.
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? drivers.filter((driver) =>
        [driver.full_name, driver.address, driver.phone]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(needle)),
      )
    : drivers;

  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      title={currentDriverId ? "Change driver" : "Assign a driver"}
      description="Only drivers who are currently active can take a job."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={loading}
            disabled={!selected || selected === currentDriverId}
            onClick={() => selected && onAssign(selected)}
          >
            {currentDriverId ? "Change driver" : "Assign driver"}
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
          placeholder="Search by name or area"
          aria-label="Search drivers"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div
        className="mt-3 max-h-80 space-y-1.5 overflow-y-auto scrollbar-thin pr-1"
        role="radiogroup"
        aria-label="Drivers"
      >
        {visible.length === 0 ? (
          <div className="py-10 text-center">
            <UserRoundX className="mx-auto size-7 text-ink-300" aria-hidden />
            <p className="mt-2 text-sm text-ink-500">
              No active driver matches “{query}”.
            </p>
          </div>
        ) : (
          visible.map((driver) => {
            const isSelected = selected === driver.id;
            const isCurrent = driver.id === currentDriverId;

            return (
              <button
                key={driver.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelected(driver.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                  isSelected
                    ? "border-ryno-600 bg-ryno-50"
                    : "border-ink-200 hover:border-ink-300 hover:bg-ink-50",
                )}
              >
                <Avatar name={driver.full_name} src={driver.avatar_url} size="sm" />

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink-900">
                      {driver.full_name}
                    </span>
                    {isCurrent ? <Tag tone="gold">Current</Tag> : null}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-ink-500">
                    {driver.address ?? "Area not recorded"}
                    {driver.phone ? ` · ${driver.phone}` : ""}
                  </span>
                </span>

                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full border transition-colors",
                    isSelected
                      ? "border-ryno-600 bg-ryno-600 text-white"
                      : "border-ink-300",
                  )}
                  aria-hidden
                >
                  {isSelected ? <Check className="size-3" /> : null}
                </span>
              </button>
            );
          })
        )}
      </div>
    </Modal>
  );
}
