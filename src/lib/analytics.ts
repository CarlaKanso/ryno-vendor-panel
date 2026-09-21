/**
 * Dashboard maths.
 *
 * Every function here is pure: it takes an already-fetched list of orders and
 * returns numbers. Nothing in this file talks to the network, which is why it
 * is the part of the app that is unit tested.
 *
 * The KPI definitions are the ones in the brief, section 4.1:
 *   Total Orders  — orders matching the filters, any status
 *   Delivered     — status `completed`
 *   Cancelled     — status `cancelled`
 *   Total Sales   — sum of `total` for `completed` orders
 *   Revenue       — sum of `vendor_earnings` for `completed` orders
 * Archived orders never reach these functions; they are excluded at fetch time.
 */

import { fromPesewas, toPesewas } from "./money";
import {
  bucketKey,
  bucketRange,
  formatBucketLabel,
  parseDateKey,
  type Granularity,
} from "./dates";

/** The compact projection of an order the dashboard works from. */
export type DashboardOrder = {
  order_no: string;
  status: string;
  created_at: string;
  shop_id: string;
  shop_name: string;
  total: number;
  vendor_earnings: number;
  items: DashboardOrderItem[];
};

export type DashboardOrderItem = {
  item_id: string;
  name: string;
  image_url: string | null;
  quantity: number;
  line_total: number;
  status: "available" | "not_available";
  main_category_id: string | null;
  category_id: string | null;
  sub_category_id: string | null;
};

export type DashboardFilters = {
  shopId?: string;
  mainCategoryId?: string;
  categoryId?: string;
  subCategoryId?: string;
  /** `YYYY-MM-DD`, inclusive. */
  from?: string;
  /** `YYYY-MM-DD`, inclusive — the whole day counts. */
  to?: string;
};

export type Kpis = {
  totalOrders: number;
  delivered: number;
  cancelled: number;
  totalSales: number;
  revenue: number;
};

/**
 * Applies the dashboard filters in memory.
 *
 * A category filter matches an order when *any* of its lines sits under that
 * category, which is how the API filters orders by category too.
 */
export function filterOrders(
  orders: readonly DashboardOrder[],
  filters: DashboardFilters,
): DashboardOrder[] {
  const fromTime = filters.from ? parseDateKey(filters.from)?.getTime() : undefined;
  // `to` is inclusive of the whole day, so compare against the next midnight.
  const toDate = filters.to ? parseDateKey(filters.to) : null;
  const toTime = toDate ? toDate.getTime() + 24 * 60 * 60 * 1000 : undefined;

  return orders.filter((order) => {
    if (filters.shopId && order.shop_id !== filters.shopId) return false;

    if (fromTime !== undefined || toTime !== undefined) {
      const placedAt = new Date(order.created_at).getTime();
      if (fromTime !== undefined && placedAt < fromTime) return false;
      if (toTime !== undefined && placedAt >= toTime) return false;
    }

    if (filters.subCategoryId) {
      return order.items.some((item) => item.sub_category_id === filters.subCategoryId);
    }
    if (filters.categoryId) {
      return order.items.some((item) => item.category_id === filters.categoryId);
    }
    if (filters.mainCategoryId) {
      return order.items.some((item) => item.main_category_id === filters.mainCategoryId);
    }

    return true;
  });
}

export function computeKpis(orders: readonly DashboardOrder[]): Kpis {
  let delivered = 0;
  let cancelled = 0;
  let salesPesewas = 0;
  let revenuePesewas = 0;

  for (const order of orders) {
    if (order.status === "completed") {
      delivered += 1;
      salesPesewas += toPesewas(order.total);
      revenuePesewas += toPesewas(order.vendor_earnings);
    } else if (order.status === "cancelled") {
      cancelled += 1;
    }
  }

  return {
    totalOrders: orders.length,
    delivered,
    cancelled,
    totalSales: fromPesewas(salesPesewas),
    revenue: fromPesewas(revenuePesewas),
  };
}

export type RevenuePoint = {
  key: string;
  label: string;
  revenue: number;
  sales: number;
  orders: number;
};

/**
 * Revenue per bucket across the whole selected range.
 *
 * Buckets with no completed orders come back as zeros rather than being
 * skipped — the Madina branch has no orders before January 2026 and Kasoa
 * closed in April, so gaps are the normal case here, not an edge case.
 */
export function buildRevenueSeries(
  orders: readonly DashboardOrder[],
  range: { from: string; to: string },
  granularity: Granularity,
): RevenuePoint[] {
  const from = parseDateKey(range.from);
  const to = parseDateKey(range.to);
  if (!from || !to || from > to) return [];

  const buckets = new Map<string, { revenue: number; sales: number; orders: number }>();
  for (const key of bucketRange(from, to, granularity)) {
    buckets.set(key, { revenue: 0, sales: 0, orders: 0 });
  }

  for (const order of orders) {
    if (order.status !== "completed") continue;
    const key = bucketKey(order.created_at, granularity);
    const bucket = buckets.get(key);
    if (!bucket) continue; // outside the requested range
    bucket.revenue += toPesewas(order.vendor_earnings);
    bucket.sales += toPesewas(order.total);
    bucket.orders += 1;
  }

  return [...buckets.entries()].map(([key, bucket]) => ({
    key,
    label: formatBucketLabel(key, granularity),
    revenue: fromPesewas(bucket.revenue),
    sales: fromPesewas(bucket.sales),
    orders: bucket.orders,
  }));
}

export type TopShop = {
  shopId: string;
  name: string;
  totalSales: number;
  orders: number;
};

/** Shops ranked by Total Sales — the sum of `total` on completed orders. */
export function topShops(orders: readonly DashboardOrder[], limit = 5): TopShop[] {
  const byShop = new Map<string, { name: string; pesewas: number; orders: number }>();

  for (const order of orders) {
    if (order.status !== "completed") continue;
    const entry = byShop.get(order.shop_id) ?? {
      name: order.shop_name,
      pesewas: 0,
      orders: 0,
    };
    entry.pesewas += toPesewas(order.total);
    entry.orders += 1;
    byShop.set(order.shop_id, entry);
  }

  return [...byShop.entries()]
    .map(([shopId, entry]) => ({
      shopId,
      name: entry.name,
      totalSales: fromPesewas(entry.pesewas),
      orders: entry.orders,
    }))
    .sort((a, b) => b.totalSales - a.totalSales || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export type TopItem = {
  itemId: string;
  name: string;
  imageUrl: string | null;
  quantity: number;
  revenue: number;
};

/**
 * Items ranked by quantity sold, counting only `available` lines on
 * `completed` orders — a line the picker marked unavailable was never sold.
 */
export function topItems(orders: readonly DashboardOrder[], limit = 5): TopItem[] {
  const byItem = new Map<
    string,
    { name: string; imageUrl: string | null; quantity: number; pesewas: number }
  >();

  for (const order of orders) {
    if (order.status !== "completed") continue;
    for (const item of order.items) {
      if (item.status !== "available") continue;
      const entry = byItem.get(item.item_id) ?? {
        name: item.name,
        imageUrl: item.image_url,
        quantity: 0,
        pesewas: 0,
      };
      entry.quantity += item.quantity;
      entry.pesewas += toPesewas(item.line_total);
      byItem.set(item.item_id, entry);
    }
  }

  return [...byItem.entries()]
    .map(([itemId, entry]) => ({
      itemId,
      name: entry.name,
      imageUrl: entry.imageUrl,
      quantity: entry.quantity,
      revenue: fromPesewas(entry.pesewas),
    }))
    .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/**
 * Picks a sensible chart granularity for a range so the default view is not a
 * 550-bar daily chart. The user can still override it with the toggle.
 */
export function suggestGranularity(range: { from: string; to: string }): Granularity {
  const from = parseDateKey(range.from);
  const to = parseDateKey(range.to);
  if (!from || !to) return "daily";
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  if (days <= 45) return "daily";
  if (days <= 240) return "weekly";
  return "monthly";
}
