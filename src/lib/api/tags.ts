/**
 * Cache tags.
 *
 * Kept in one plain module (no `server-only`) so both the cached readers and
 * the Server Actions that invalidate them refer to the same strings.
 */
export const CACHE_TAGS = {
  vendor: "vendor",
  shops: "shops",
  categories: "categories",
  drivers: "drivers",
  items: "items",
  /** Every cached read that derives from the order collection. */
  orders: "orders",
  reviews: "reviews",
  /** One order's detail record. */
  order: (orderNo: string) => `order:${orderNo}`,
} as const;
