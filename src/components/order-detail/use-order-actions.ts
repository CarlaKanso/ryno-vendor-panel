"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { refetchOrder, type ActionResult } from "@/actions/orders";
import type { OrderDetail } from "@/lib/api/types";

export type RunAction = (
  key: string,
  action: () => Promise<ActionResult>,
  options?: { success?: string; onSuccess?: (order: OrderDetail) => void },
) => Promise<void>;

/**
 * Owns the order on the client and runs every write through one path.
 *
 * What this buys:
 *
 *  - **No manual refresh.** Every successful write returns the full updated
 *    order, which replaces the state, so the timeline, the totals, the product
 *    list and the available actions all re-render from one response.
 *  - **No double submits.** A single `pendingAction` key is held for the whole
 *    app: while any action runs, every button is disabled and the one that was
 *    pressed shows a spinner.
 *  - **409s are handled, not swallowed.** A conflict means someone else moved
 *    the order on. Rather than leave a stale screen, the toast offers a reload
 *    that pulls the current record.
 */
export function useOrderActions(initial: OrderDetail) {
  const [order, setOrder] = useState(initial);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // The guard is a ref, not the state above. `pendingAction` is only correct
  // once React has re-rendered, so a handler still holding the previous `run`
  // would read `null` and let a second write through. A ref is written
  // synchronously, so the very next call sees it — and keeping it out of the
  // dependency list means `run` has a stable identity.
  const inFlight = useRef(false);

  const reload = useCallback(async () => {
    const result = await refetchOrder(order.order_no);
    if (result.ok) {
      setOrder(result.order);
      toast.success("Reloaded — this is the current state of the order.");
    } else {
      toast.error(result.message);
    }
  }, [order.order_no]);

  const run = useCallback<RunAction>(
    async (key, action, options) => {
      // A second press while something is in flight is ignored outright; the
      // disabled button is the visible half of the same guard.
      if (inFlight.current) return;
      inFlight.current = true;
      setPendingAction(key);

      try {
        const result = await action();

        if (result.ok) {
          setOrder(result.order);
          if (options?.success) toast.success(options.success);
          options?.onSuccess?.(result.order);
          return;
        }

        if (result.conflict) {
          toast.error(result.message, {
            description: "Someone else may have changed this order.",
            action: { label: "Reload", onClick: () => void reload() },
            duration: 10_000,
          });
          return;
        }

        toast.error(result.message);
      } finally {
        inFlight.current = false;
        setPendingAction(null);
      }
    },
    [reload],
  );

  return { order, run, pendingAction };
}
