"use client";

import { Check, Plus, Trash2, X } from "lucide-react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import {
  addSubstituteItem,
  removeSubstituteItem,
  setItemAvailability,
} from "@/actions/orders";
import { Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/cn";
import type { OrderDetail, OrderItem } from "@/lib/api/types";
import { formatMoney } from "@/lib/money";
import { AddItemDialog } from "./add-item-dialog";
import type { RunAction } from "./use-order-actions";

/**
 * Product List, plus the two line-level actions.
 *
 * Marking a line unavailable changes `subtotal`, `total` and
 * `refunded_amount`, so the response is fed straight back into the shared
 * order state and the totals above re-render with it. Nothing is computed
 * locally from the old numbers.
 */

/** The API only accepts line edits while the order is still in the shop. */
const EDITABLE_STATUSES = new Set(["pending", "accepted"]);

export function ProductList({
  order,
  run,
  pendingAction,
}: {
  order: OrderDetail;
  run: RunAction;
  pendingAction: string | null;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<OrderItem | null>(null);

  const editable = EDITABLE_STATUSES.has(order.status) && !order.archived_at;
  const currency = order.currency ?? "GHS";

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200/70 px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">
            Product List
          </h2>
          <p className="mt-0.5 text-sm text-ink-500">
            {order.items.length} line{order.items.length === 1 ? "" : "s"} on this order
          </p>
        </div>

        {editable ? (
          <Button
            variant="secondary"
            disabled={pendingAction !== null}
            onClick={() => setAddOpen(true)}
            icon={<Plus className="size-4 text-ryno-600" aria-hidden />}
          >
            Add substitute
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[820px] text-sm">
          <caption className="sr-only">Items on order {order.order_no}</caption>
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50/60 text-left text-xs uppercase tracking-wide text-ink-500">
              <th scope="col" className="w-12 px-5 py-2.5 font-medium">
                #
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Product
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Barcode
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Qty
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Base Price
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Total Price
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Status
              </th>
              {editable ? (
                <th scope="col" className="px-5 py-2.5 text-right font-medium">
                  Action
                </th>
              ) : null}
            </tr>
          </thead>

          {/* Entrance comes from the CSS stagger on the body; Motion is here
              only for the exit, so a removed substitute collapses out of the
              table instead of vanishing. */}
          <tbody className="stagger">
            <AnimatePresence initial={false}>
              {order.items.map((item, index) => {
                const unavailable = item.status === "not_available";
                const toggleKey = `item:${item.id}`;

                return (
                  <motion.tr
                    key={item.id}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "border-b border-ink-100 last:border-0",
                      unavailable && "bg-red-50/40",
                    )}
                  >
                    <td className="px-5 py-3 text-ink-400 tabular">{index + 1}</td>

                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-100 ring-1 ring-ink-200">
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
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "truncate font-medium text-ink-900",
                              unavailable && "line-through decoration-ink-400",
                            )}
                          >
                            {item.name}
                          </p>
                          <p className="truncate text-xs text-ink-500">
                            {item.sku ?? "—"}
                            {item.is_additional ? (
                              <Tag tone="gold" className="ml-2">
                                Added
                              </Tag>
                            ) : null}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3 text-ink-600 tabular">
                      {item.barcode ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-right text-ink-700 tabular">
                      {item.quantity}
                    </td>
                    <td className="px-3 py-3 text-right text-ink-700 tabular">
                      {formatMoney(item.unit_price, currency)}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-3 text-right font-semibold tabular",
                        unavailable ? "text-ink-400 line-through" : "text-ink-900",
                      )}
                    >
                      {formatMoney(item.line_total, currency)}
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
                          unavailable
                            ? "bg-red-50 text-red-700 ring-red-200"
                            : "bg-ryno-50 text-ryno-700 ring-ryno-200",
                        )}
                      >
                        {unavailable ? (
                          <X className="size-3" aria-hidden />
                        ) : (
                          <Check className="size-3" aria-hidden />
                        )}
                        {unavailable ? "Not Available" : "Available"}
                      </span>
                    </td>

                    {editable ? (
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant={unavailable ? "secondary" : "ghost"}
                            loading={pendingAction === toggleKey}
                            disabled={pendingAction !== null}
                            onClick={() =>
                              void run(
                                toggleKey,
                                () =>
                                  setItemAvailability(
                                    order.order_no,
                                    item.id,
                                    unavailable ? "available" : "not_available",
                                  ),
                                {
                                  success: unavailable
                                    ? `${item.name} is available again`
                                    : `${item.name} marked not available`,
                                },
                              )
                            }
                          >
                            {unavailable ? "Mark available" : "Mark unavailable"}
                          </Button>

                          {item.is_additional ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={pendingAction !== null}
                              onClick={() => setRemoving(item)}
                              aria-label={`Remove ${item.name}`}
                              className="text-red-600 hover:bg-red-50"
                              icon={<Trash2 className="size-3.5" aria-hidden />}
                            />
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <AddItemDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        currency={currency}
        loading={pendingAction === "item:add"}
        onAdd={(itemId, quantity) =>
          void run(
            "item:add",
            () => addSubstituteItem(order.order_no, itemId, quantity),
            { success: "Substitute added", onSuccess: () => setAddOpen(false) },
          )
        }
      />

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="Remove this substitute?"
        description={`${removing?.name ?? "This line"} will be taken off the order and the totals recalculated.`}
        confirmLabel="Remove item"
        loading={pendingAction === `item:remove:${removing?.id}`}
        onConfirm={() => {
          const item = removing;
          if (!item) return;
          void run(
            `item:remove:${item.id}`,
            () => removeSubstituteItem(order.order_no, item.id),
            { success: "Substitute removed", onSuccess: () => setRemoving(null) },
          );
        }}
      />
    </Card>
  );
}
