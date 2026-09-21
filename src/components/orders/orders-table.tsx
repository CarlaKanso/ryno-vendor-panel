"use client";

import { Eye, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { restoreOrder } from "@/actions/orders";
import { rowVariants } from "@/components/motion/variants";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SortHeader } from "@/components/ui/sort-header";
import type { Order } from "@/lib/api/types";
import { formatDateTime } from "@/lib/dates";
import { formatAmount } from "@/lib/money";

export function OrdersTable({
  orders,
  vendorName,
  startIndex,
  sort,
  archivedOnly,
}: {
  orders: Order[];
  vendorName: string;
  /** Row number of the first row, so numbering continues across pages. */
  startIndex: number;
  sort: string;
  archivedOnly: boolean;
}) {
  if (orders.length === 0) {
    return (
      <EmptyState
        title={archivedOnly ? "No archived orders" : "No orders match these filters"}
        description={
          archivedOnly
            ? "Orders you archive from the details page will show up here."
            : "Try widening the date range, clearing the search, or picking another branch."
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[1100px] text-sm">
        <caption className="sr-only">
          Orders matching the current filters, {orders.length} shown on this page
        </caption>
        <thead>
          <tr className="border-b border-ink-200 bg-ink-50/60 text-left text-xs uppercase tracking-wide text-ink-500">
            <th scope="col" className="w-12 px-5 py-2.5 font-medium">
              #
            </th>
            <SortHeader label="Order Id" field="order_no" currentSort={sort} />
            <th scope="col" className="px-3 py-2.5 font-medium">
              User Name
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Vendor Name
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Shop Name
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Driver Name
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">
              Total Amount
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">
              Discount
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">
              Delivery
            </th>
            <SortHeader
              label="Gross Amount"
              field="total"
              currentSort={sort}
              align="right"
            />
            <th scope="col" className="px-3 py-2.5 font-medium">
              Order Status
            </th>
            <SortHeader label="Order Date" field="created_at" currentSort={sort} />
            <th scope="col" className="px-5 py-2.5 text-right font-medium">
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {orders.map((order, index) => (
            <motion.tr
              key={order.id}
              variants={rowVariants(index)}
              initial="hidden"
              animate="show"
              className="border-b border-ink-100 transition-colors last:border-0 hover:bg-ryno-50/40"
            >
              <td className="px-5 py-3 text-ink-400 tabular">{startIndex + index}</td>
              <td className="px-3 py-3">
                <Link
                  href={`/orders/${order.order_no}`}
                  className="font-medium text-ryno-700 transition-colors hover:text-ryno-600 tabular"
                >
                  {order.order_no}
                </Link>
              </td>
              <td className="max-w-[180px] truncate px-3 py-3 text-ink-800">
                {order.customer.full_name}
              </td>
              <td className="max-w-[160px] truncate px-3 py-3 text-ink-600">
                {vendorName}
              </td>
              <td className="max-w-[180px] truncate px-3 py-3 text-ink-600">
                {order.shop.name}
              </td>
              <td className="max-w-[160px] truncate px-3 py-3 text-ink-600">
                {order.driver?.full_name ?? (
                  <span className="text-ink-400">Not Assigned</span>
                )}
              </td>
              <td className="px-3 py-3 text-right text-ink-700 tabular">
                {formatAmount(order.subtotal)}
              </td>
              <td className="px-3 py-3 text-right text-ink-700 tabular">
                {formatAmount(order.discount)}
              </td>
              <td className="px-3 py-3 text-right text-ink-700 tabular">
                {formatAmount(order.delivery_fee)}
              </td>
              <td className="px-3 py-3 text-right font-semibold text-ink-900 tabular">
                {formatAmount(order.total)}
              </td>
              <td className="px-3 py-3">
                <StatusBadge status={order.status} />
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-ink-500">
                {formatDateTime(order.created_at)}
              </td>
              <td className="px-5 py-3">
                <div className="flex justify-end gap-2">
                  {archivedOnly ? (
                    <RestoreButton orderNo={order.order_no} />
                  ) : null}
                  <Link
                    href={`/orders/${order.order_no}`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-medium text-ink-700 ring-1 ring-inset ring-ink-300 transition-colors hover:bg-ink-50"
                  >
                    <Eye className="size-3.5" aria-hidden />
                    View
                  </Link>
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RestoreButton({ orderNo }: { orderNo: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  const restore = async () => {
    setSubmitting(true);
    const result = await restoreOrder(orderNo);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(`Order #${orderNo} restored`);
    // The row belongs to the archived-only view, so the list has to re-read.
    startTransition(() => router.refresh());
  };

  return (
    <Button
      size="sm"
      variant="secondary"
      loading={submitting || isPending}
      onClick={restore}
      icon={<Undo2 className="size-3.5" aria-hidden />}
    >
      Restore
    </Button>
  );
}
