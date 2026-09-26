/**
 * The monthly recap.
 *
 * Everything here is pure and computed from data the dashboard already holds:
 * the cached order snapshot, filtered to one month, and that month's reviews.
 * The card-by-card numbers reuse the tested analytics functions — the recap is
 * a new way of *telling* the month, not a new way of counting it.
 */

import {
  buildRushHours,
  computeKpis,
  topItems,
  topShops,
  type DashboardOrder,
  type Kpis,
  type RushHours,
  type TopItem,
  type TopShop,
} from "./analytics";
import type { Review } from "./api/types";
import { formatMonth, monthRange, parseDateKey, shiftMonth } from "./dates";
import { fromPesewas, toPesewas } from "./money";

/** Items the picker had to mark unavailable, and what that cost. */
export type DropReport = {
  /** Lines marked `not_available` on completed orders. */
  lines: number;
  /** Completed orders that lost at least one line. */
  orders: number;
  /** The `line_total` of every dropped line, which is money that was in a basket. */
  value: number;
  /** The items dropped most often, worst first. */
  worst: Array<{ itemId: string; name: string; imageUrl: string | null; lines: number }>;
};

/**
 * Only completed orders count. A cancelled order's unavailable lines were not
 * lost to stock — the whole order went — and a pending one may still be fixed.
 */
export function dropReport(orders: readonly DashboardOrder[], limit = 3): DropReport {
  const byItem = new Map<string, { name: string; imageUrl: string | null; lines: number }>();
  let lines = 0;
  let affected = 0;
  let pesewas = 0;

  for (const order of orders) {
    if (order.status !== "completed") continue;
    let lost = false;
    for (const item of order.items) {
      if (item.status !== "not_available") continue;
      lost = true;
      lines += 1;
      pesewas += toPesewas(item.line_total);
      const entry = byItem.get(item.item_id) ?? {
        name: item.name,
        imageUrl: item.image_url,
        lines: 0,
      };
      entry.lines += 1;
      byItem.set(item.item_id, entry);
    }
    if (lost) affected += 1;
  }

  return {
    lines,
    orders: affected,
    value: fromPesewas(pesewas),
    worst: [...byItem.entries()]
      .map(([itemId, entry]) => ({ itemId, ...entry }))
      .sort((a, b) => b.lines - a.lines || a.name.localeCompare(b.name))
      .slice(0, limit),
  };
}

/**
 * The review worth putting in big type: the highest rating, and among those
 * the one with the most to say. Reviews without a comment cannot be quoted, so
 * they do not compete.
 */
export function bestReview(reviews: readonly Review[]): Review | null {
  let best: Review | null = null;
  for (const review of reviews) {
    const comment = review.comment?.trim();
    if (!comment) continue;
    if (
      !best ||
      review.rating > best.rating ||
      (review.rating === best.rating && comment.length > (best.comment?.trim().length ?? 0))
    ) {
      best = review;
    }
  }
  return best;
}

/** `(78, 70)` → `0.114…`; `null` when there is nothing to compare against. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return (current - previous) / previous;
}

/**
 * Average rating to one decimal, or `null` with no reviews — never `NaN`, and
 * never `0`, which would read as a terrible month rather than a quiet one.
 */
export function averageRating(reviews: readonly Review[]): number | null {
  if (reviews.length === 0) return null;
  const sum = reviews.reduce((total, review) => total + review.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

/**
 * How many days of a month have happened by `today`, inclusive — the whole
 * month once it is over, and only the elapsed part while it is running, so
 * "one order every N hours" is never diluted by days that have not occurred.
 */
export function daysCovered(month: string, today: string): number {
  const range = monthRange(month);
  const from = parseDateKey(range.from);
  const to = parseDateKey(today < range.to ? today : range.to);
  if (!from || !to || to < from) return 0;
  return Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
}

export type Recap = {
  month: string;
  label: string;
  previousLabel: string;
  vendorName: string;
  currency: string;
  kpis: Kpis;
  previous: Kpis;
  /** Orders this month against last, as a fraction; `null` without a last. */
  change: number | null;
  /** Hours between orders on average; `null` when there were none. */
  hoursPerOrder: number | null;
  rush: RushHours;
  items: TopItem[];
  shops: TopShop[];
  /** The top branch's share of Total Sales, `0`–`1`. */
  leadShare: number | null;
  reviews: { count: number; average: number | null; best: Review | null };
  drops: DropReport;
};

export function buildRecap({
  month,
  today,
  orders,
  previousOrders,
  reviews,
  vendorName,
  currency,
}: {
  month: string;
  today: string;
  /** The month's orders, already filtered. */
  orders: readonly DashboardOrder[];
  /** The previous month's, for the comparison. */
  previousOrders: readonly DashboardOrder[];
  reviews: readonly Review[];
  vendorName: string;
  currency: string;
}): Recap {
  const kpis = computeKpis(orders);
  const previous = computeKpis(previousOrders);
  const days = daysCovered(month, today);
  const shops = topShops(orders, 7);
  const salesAcrossShops = shops.reduce((sum, shop) => sum + toPesewas(shop.totalSales), 0);

  return {
    month,
    label: formatMonth(month),
    previousLabel: formatMonth(shiftMonth(month, -1)),
    vendorName,
    currency,
    kpis,
    previous,
    change: percentChange(kpis.totalOrders, previous.totalOrders),
    hoursPerOrder: kpis.totalOrders > 0 && days > 0 ? (days * 24) / kpis.totalOrders : null,
    // The month is read as itself, thin or not: a recap of August is about
    // August, and the sample-size rule that guards the dashboard's default
    // view has no business overriding a month somebody chose to look back on.
    rush: buildRushHours(orders, orders, { scope: "range", range: monthRange(month), today }),
    items: topItems(orders, 3),
    shops,
    leadShare:
      shops.length > 0 && salesAcrossShops > 0
        ? toPesewas(shops[0].totalSales) / salesAcrossShops
        : null,
    reviews: {
      count: reviews.length,
      average: averageRating(reviews),
      best: bestReview(reviews),
    },
    drops: dropReport(orders),
  };
}
