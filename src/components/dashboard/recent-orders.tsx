"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import type { Order } from "@/lib/api/types";
import { formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

export function RecentOrders({ orders }: { orders: Order[] }) {
  const router = useRouter();

  // `min-w-0` on the card root is load-bearing. This card is a grid item, and
  // grid items default to `min-width: auto` — they refuse to shrink below
  // their content. Without it the 620px-min table forced the card to ~950px
  // inside a 375px screen, the `overflow-x-auto` below never got to scroll,
  // and the sibling card was dragged out to match.

  return (
    <div className="flex h-full min-w-0 flex-col rounded-card border border-ink-200/80 bg-white shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-ink-200/70 px-5 py-4">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">
          Recent Orders
        </h2>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1 text-sm font-medium text-ryno-700 transition-colors hover:text-ryno-600"
        >
          View all
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          compact
          title="No orders in this period"
          description="Once a customer checks out, the newest five land here."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <caption className="sr-only">
              The five newest orders matching the current filters
            </caption>
            <thead>
              <tr className="border-b border-ink-200/70 text-left text-xs uppercase tracking-wide text-ink-500">
                <th scope="col" className="px-5 py-2.5 font-medium">
                  Customer
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Order No.
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Shop
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Amount
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Status
                </th>
                <th scope="col" className="px-5 py-2.5 font-medium">
                  Order Date
                </th>
              </tr>
            </thead>
            <tbody className="stagger">
              {orders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => router.push(`/orders/${order.order_no}`)}
                  className="cursor-pointer border-b border-ink-100 last:border-0 transition-colors hover:bg-ryno-50/50"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={order.customer.full_name}
                        src={order.customer.avatar_url}
                        size="sm"
                      />
                      <div className="min-w-0">
                        {/* The row is clickable for the mouse; the name stays a
                            real link so keyboard and screen-reader users get
                            the same destination. */}
                        <Link
                          href={`/orders/${order.order_no}`}
                          className="block truncate font-medium text-ink-900 hover:text-ryno-700"
                        >
                          {order.customer.full_name}
                        </Link>
                        <p className="truncate text-xs text-ink-500">
                          {order.customer.email ?? "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-medium text-ink-700 tabular">
                    {order.order_no}
                  </td>
                  <td className="max-w-[160px] truncate px-3 py-3 text-ink-600">
                    {order.shop.name}
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-ink-900 tabular">
                    {formatMoney(order.total, order.currency)}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-ink-500">
                    {formatDateTime(order.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
