import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import type { DashboardOrder } from "../analytics";
import { apiFetch, mapWithConcurrency, type QueryValue } from "./http";
import { CACHE_TAGS } from "./tags";
import type { Envelope, Order, OrderDetail, OrderStatus, Paginated } from "./types";

const MAX_PER_PAGE = 100;

export type OrderListQuery = {
  page?: number;
  perPage?: number;
  status?: OrderStatus[];
  shopId?: string;
  driverId?: string;
  from?: string;
  to?: string;
  mainCategoryId?: string;
  categoryId?: string;
  subCategoryId?: string;
  q?: string;
  archived?: "exclude" | "include" | "only";
  sort?: string;
  includeItems?: boolean;
};

function toApiQuery(query: OrderListQuery): Record<string, QueryValue> {
  return {
    page: query.page,
    per_page: query.perPage,
    status: query.status?.length ? query.status.join(",") : undefined,
    shop_id: query.shopId,
    driver_id: query.driverId,
    from: query.from,
    to: query.to,
    main_category_id: query.mainCategoryId,
    category_id: query.categoryId,
    sub_category_id: query.subCategoryId,
    q: query.q,
    archived: query.archived,
    sort: query.sort,
    include: query.includeItems ? "items" : undefined,
  };
}

/**
 * One page of orders — what the Order List renders.
 *
 * Deliberately *not* cached: the list is the vendor's working queue, they act
 * on it, and a stale page after accepting an order is worse than one more
 * round trip. It is fast anyway, because it is a single request for 10–100
 * rows that the API has already filtered, sorted and paginated.
 */
export async function getOrders(query: OrderListQuery): Promise<Paginated<Order>> {
  return apiFetch<Paginated<Order>>("/v1/orders", { query: toApiQuery(query) });
}

export async function getOrder(orderNo: string): Promise<OrderDetail> {
  const response = await apiFetch<Envelope<OrderDetail>>(
    `/v1/orders/${encodeURIComponent(orderNo)}`,
  );
  return response.data;
}

/**
 * Every order matching a query, followed across all pages.
 *
 * Page 1 tells us `total_pages`; the rest are fetched four at a time. Used by
 * the Excel export (which must include every matching row, not just the
 * visible page) and by the dashboard snapshot below.
 */
export async function getAllOrders(query: OrderListQuery): Promise<Order[]> {
  const first = await getOrders({ ...query, page: 1, perPage: MAX_PER_PAGE });
  const totalPages = first.meta.total_pages;
  if (totalPages <= 1) return first.data;

  const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
  const pages = await mapWithConcurrency(remaining, 4, (page) =>
    getOrders({ ...query, page, perPage: MAX_PER_PAGE }),
  );

  return [first.data, ...pages.map((page) => page.data)].flat();
}

/**
 * The dashboard snapshot: every non-archived order, projected down to the
 * fields the dashboard actually reads.
 *
 * Why one un-filtered snapshot instead of a fetch per filter combination:
 *
 *  - The API cannot aggregate, so any KPI needs the rows anyway. With a cap of
 *    100 per page that is ~14 requests for Kaya Market's 1,400 orders.
 *  - Caching *per filter combination* would barely ever hit: the date range
 *    alone has unbounded cardinality. Caching the whole collection once and
 *    filtering in memory turns every filter change into zero network calls.
 *  - The projection matters. Keeping only what the KPIs, the chart and the two
 *    Top Selling tabs read takes the payload from several MB to a few hundred
 *    KB, which is the difference between a sane cache entry and a silly one.
 *
 * `cacheLife('minutes')` keeps it honest, and every order write calls
 * `updateTag(CACHE_TAGS.orders)`, so a vendor sees their own change at once.
 *
 * Where this stops working: it is O(all orders) in memory, so somewhere in the
 * tens of thousands of rows it has to become a server-side aggregate endpoint.
 * That is a backend change, and the backend is not mine in this exercise.
 */
export async function getDashboardSnapshot(): Promise<DashboardOrder[]> {
  "use cache";
  cacheTag(CACHE_TAGS.orders);
  cacheLife("minutes");

  const orders = await getAllOrders({
    archived: "exclude",
    includeItems: true,
    sort: "-created_at",
  });

  return orders.map(projectForDashboard);
}

function projectForDashboard(order: Order): DashboardOrder {
  return {
    order_no: order.order_no,
    status: order.status,
    created_at: order.created_at,
    shop_id: order.shop.id,
    shop_name: order.shop.name,
    total: order.total,
    vendor_earnings: order.vendor_earnings,
    items: (order.items ?? []).map((item) => ({
      item_id: item.item_id,
      name: item.name,
      image_url: item.image_url,
      quantity: item.quantity,
      line_total: item.line_total,
      status: item.status,
      main_category_id: item.main_category_id,
      category_id: item.category_id,
      sub_category_id: item.sub_category_id,
    })),
  };
}

/**
 * The 5 newest orders for the dashboard, with the same filters applied.
 *
 * A separate request rather than a slice of the snapshot: it needs the
 * customer's avatar and email, which the projection drops, and one request for
 * five rows is cheaper than widening 1,400.
 */
export async function getRecentOrders(query: OrderListQuery): Promise<Order[]> {
  const response = await getOrders({
    ...query,
    page: 1,
    perPage: 5,
    sort: "-created_at",
    archived: "exclude",
  });
  return response.data;
}
