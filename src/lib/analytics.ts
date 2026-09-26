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
  toDateKey,
  weekdayIndex,
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

/* ---------------------------------------------------------------------------
   Rush Hours

   When demand actually arrives, as a weekday × hour grid. Nothing in the brief
   asks for this; it answers the question the other KPIs cannot — not "how much
   did we sell" but "when should somebody be on the floor".

   Two definitions worth stating, because both differ from the KPI cards:

   1. Every order counts, whatever its status. A cancelled order still arrived
      at 1 PM and still needed a picker to look at it, so cancellations belong
      in a staffing pattern even though they are kept out of Total Sales.
   2. The instant used is `created_at` — when the customer pressed the button —
      not `completed_at`, which describes the driver's day rather than demand.
--------------------------------------------------------------------------- */

/** One cell of the grid: a weekday, an hour, and how many orders landed there. */
export type RushCell = {
  /** `0` = Monday, matching the Monday-started weeks the revenue chart buckets. */
  day: number;
  /** Hour of day in UTC, which is Accra time. */
  hour: number;
  orders: number;
  /** `0` for an empty slot, otherwise `1`–`5`: the shade the cell wears. */
  level: number;
  /** Share of the orders in the window, `0`–`1`. */
  share: number;
};

/** A contiguous run of hours, summed across the whole week. */
export type RushWindow = {
  /** Inclusive. */
  fromHour: number;
  /** Inclusive — `formatHourRange` turns it into the exclusive clock label. */
  toHour: number;
  orders: number;
  share: number;
};

export type RushHours = {
  /** Only the hours that hold orders, so a supermarket's dead night is not
      nineteen columns of white. Contiguous and ascending. */
  hours: number[];
  /** Seven rows, Monday first, each one cell per entry in `hours`. */
  rows: RushCell[][];
  dayTotals: number[];
  /**
   * How many of each weekday the span actually contains — 78 Mondays, 79
   * Tuesdays, and so on. The denominator behind the per-day average, and the
   * reason two row totals are not quite like for like.
   */
  dayOccurrences: number[];
  /** Indexed by hour of day, `0`–`23`, not by position in `hours`. */
  hourTotals: number[];
  max: number;
  total: number;
  peak: RushCell | null;
  /**
   * The busiest run of hours, plus a second when the day has two rushes.
   * In clock order, not size order — they read as a day, not as a ranking.
   */
  rushes: RushWindow[];
  busiestDay: { day: number; orders: number; share: number } | null;
  /**
   * The window the grid read, as `YYYY-MM-DD` keys: the selected range when
   * that is what was read, otherwise the span of the orders themselves. This
   * is what `dayOccurrences` counts over.
   */
  span: { from: string; to: string } | null;
  /** How many orders the selected date range held, widened or not, so the card
      can say what it chose and why. */
  rangeTotal: number;
  /** How many there are in total once the date filter is dropped. */
  allTimeTotal: number;
  /** Which set was actually read. */
  source: "range" | "all";
  /** True when the vendor asked for a range too thin to read an hourly pattern. */
  thin: boolean;
  /**
   * True only when the *card* overrode a thin date range on its own. A vendor
   * who picks "all time" from the toggle has not been overridden, so this stays
   * false and the card owes them no explanation.
   */
  widened: boolean;
};

/**
 * Below this many orders an hourly grid is noise rather than a pattern.
 *
 * The number is not a guess. This vendor averages ~78 orders a month, and the
 * dashboard opens on the last 30 days: ~100 orders spread over 133 live cells,
 * where the busiest hour of the busiest day holds *four*. At that density the
 * darkest cell is one order away from the lightest and the grid would confidently
 * point at a peak that is noise. Around 300 orders the two real rushes separate
 * from the background, so that is the floor.
 */
export const RUSH_HOURS_MIN_ORDERS = 300;

/**
 * Which orders the grid reads. `auto` lets the sample-size rule below decide.
 *
 * Defined here rather than in `search-params` so the URL module imports the
 * domain's vocabulary, the same way it imports `Granularity` and `OrderStatus`
 * — the query string describes the analytics, not the other way round.
 */
export const RUSH_SCOPES = ["auto", "range", "all"] as const;

export type RushScope = (typeof RUSH_SCOPES)[number];

export type RushHoursOptions = {
  /**
   * `auto` lets the sample-size rule below decide. `range` and `all` are the
   * vendor overruling it from the card's own toggle — a thin February is still
   * a fair question to ask, and the card's job is then to answer it and warn,
   * not to refuse.
   */
  scope?: RushScope;
  minOrders?: number;
  /**
   * The selected date window, so the per-day average can divide by the days the
   * vendor asked about rather than only the days that happened to hold an
   * order. Omitted, the observed span of the orders is used instead.
   */
  range?: { from: string; to: string };
  /**
   * Today, as a `YYYY-MM-DD` key. A window may legitimately run to the end of
   * the month; the days in it that have not happened yet are not days anybody
   * failed to sell on, so they are cut from the denominator. Passed in rather
   * than read from the clock, so this stays testable.
   */
  today?: string;
};

/** How many hours a "rush" spans — long enough to be a shift, short enough to be advice. */
const RUSH_WINDOW_HOURS = 3;

/** A second rush is only worth naming if it is within this much of the first. */
const SECOND_RUSH_RATIO = 0.6;

const LEVELS = 5;

/**
 * The weekday × hour grid.
 *
 * Takes both the filtered orders and the same orders without the date filter,
 * and chooses: a pattern needs a sample, so when the selected range holds too
 * few orders to read hourly the grid widens to everything it has and says so
 * (`widened`) rather than drawing a confident picture of ten orders. Shop and
 * category filters always apply — those slice the pattern without thinning it
 * past the point of meaning.
 */
export function buildRushHours(
  inRange: readonly DashboardOrder[],
  allTime: readonly DashboardOrder[],
  { scope = "auto", minOrders = RUSH_HOURS_MIN_ORDERS, range, today }: RushHoursOptions = {},
): RushHours {
  // Only claim to have widened if widening actually added something: selecting
  // the full 18 months is not the same as overriding the user's range.
  const widened =
    scope === "auto" && inRange.length < minOrders && allTime.length > inRange.length;
  const source = scope === "all" || widened ? "all" : "range";
  const orders = source === "all" ? allTime : inRange;

  const counts: number[][] = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  const hourTotals = new Array<number>(24).fill(0);
  const dayTotals = new Array<number>(7).fill(0);
  let total = 0;
  let from = "";
  let to = "";

  for (const order of orders) {
    const placedAt = new Date(order.created_at);
    if (Number.isNaN(placedAt.getTime())) continue;

    const day = weekdayIndex(order.created_at);
    const hour = placedAt.getUTCHours();
    counts[day][hour] += 1;
    hourTotals[hour] += 1;
    dayTotals[day] += 1;
    total += 1;

    const key = toDateKey(placedAt);
    if (!from || key < from) from = key;
    if (!to || key > to) to = key;
  }

  const observed = total === 0 ? null : { from, to };

  /*
   * The window the grid claims to have read — and so the window the per-day
   * average must divide by.
   *
   * Dividing by the span of the orders themselves was wrong: a quiet Monday is
   * still a Monday. Ask for January and February with orders only in the last
   * fortnight of February and the observed span holds two Mondays, so "3.0 per
   * Monday" gets reported where the honest figure over the eight Mondays asked
   * about is 0.8.
   *
   * So a selected range is used whole, minus only the part of it that has not
   * happened yet. Nothing is trimmed off the front: a Monday before this
   * vendor's first order is still a Monday they took no orders on, and pulling
   * the average down is the truthful direction to be wrong in. "All time" has
   * no bounds but the data's own, so it keeps the observed span.
   */
  const window =
    total === 0
      ? null
      : source === "range" && range
        ? (untilToday(range, today) ?? observed)
        : observed;

  // Trim the hours nobody orders in. Derived from the data rather than from a
  // hard-coded trading day: this vendor's first order of any day is at 04:00
  // and its last at 22:00, but that is the API's business, not this function's.
  let lowest = 24;
  let highest = -1;
  for (let hour = 0; hour < 24; hour += 1) {
    if (hourTotals[hour] === 0) continue;
    lowest = Math.min(lowest, hour);
    highest = Math.max(highest, hour);
  }
  const hours =
    highest < lowest
      ? []
      : Array.from({ length: highest - lowest + 1 }, (_, index) => lowest + index);

  const max = Math.max(...counts.flat(), 0);

  const rows = counts.map((row, day) =>
    hours.map((hour) => ({
      day,
      hour,
      orders: row[hour],
      // Equal-width bins over 1..max. A cell with a single order is never
      // level 0, so "quiet" and "closed" never wear the same colour.
      level: row[hour] === 0 ? 0 : Math.min(LEVELS, Math.ceil((row[hour] / max) * LEVELS)),
      share: total === 0 ? 0 : row[hour] / total,
    })),
  );

  // `rows.flat()` walks Monday-first and hour-ascending, so a plain `>` leaves
  // the earliest slot holding a tie rather than the last one seen.
  const peak =
    total === 0
      ? null
      : rows.flat().reduce((best, cell) => (cell.orders > best.orders ? cell : best));

  const busiestDayIndex = dayTotals.reduce(
    (best, orderCount, day) => (orderCount > dayTotals[best] ? day : best),
    0,
  );

  return {
    hours,
    rows,
    dayTotals,
    dayOccurrences: window
      ? countWeekdays(window.from, window.to)
      : new Array<number>(7).fill(0),
    hourTotals,
    max,
    total,
    peak,
    rushes: findRushes(hours, hourTotals, total),
    busiestDay:
      total === 0
        ? null
        : {
            day: busiestDayIndex,
            orders: dayTotals[busiestDayIndex],
            share: dayTotals[busiestDayIndex] / total,
          },
    span: window,
    rangeTotal: inRange.length,
    allTimeTotal: allTime.length,
    source,
    // Computed here rather than by the card, so the caveat can never disagree
    // with the threshold the grid was actually built against.
    thin: source === "range" && total < minOrders,
    widened,
  };
}

/**
 * A window with any future part cut off, or `null` if none of it has happened.
 * `YYYY-MM-DD` sorts lexicographically, so plain string comparison is safe.
 */
function untilToday(
  range: { from: string; to: string },
  today: string | undefined,
): { from: string; to: string } | null {
  const to = today && today < range.to ? today : range.to;
  return range.from <= to ? { from: range.from, to } : null;
}

/**
 * How many Mondays, Tuesdays … fall between two date keys, inclusive.
 *
 * A row of the grid is every Monday stacked together, so "175 orders on
 * Mondays" only means something next to "over 78 Mondays". The window rarely
 * divides into whole weeks — this one holds 79 Tuesdays but 78 Saturdays — so
 * the count is walked rather than assumed.
 */
function countWeekdays(from: string, to: string): number[] {
  const counts = new Array<number>(7).fill(0);
  const start = parseDateKey(from);
  const end = parseDateKey(to);
  if (!start || !end || start > end) return counts;

  // Arithmetic rather than a walk: `from` comes from the query string, and
  // `?from=0001-01-01` would otherwise spin 740,000 times on every request.
  // Whole weeks fall to every weekday alike; only the remainder needs placing,
  // starting from the weekday the window opens on. UTC has no daylight saving,
  // so the day count is exact.
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  counts.fill(Math.floor(days / 7));

  const opensOn = (start.getUTCDay() + 6) % 7;
  for (let extra = 0; extra < days % 7; extra += 1) {
    counts[(opensOn + extra) % 7] += 1;
  }

  return counts;
}

/**
 * The busiest run of hours, plus a second one when the day has two rushes.
 *
 * A supermarket does not have *a* rush; Kaya Market has lunch and evening, and
 * a card that names only the bigger of the two would hide half the answer. The
 * second is reported only when it is within `SECOND_RUSH_RATIO` of the first —
 * a third of the traffic is a rush, a tenth is just the afternoon.
 */
function findRushes(
  hours: readonly number[],
  hourTotals: readonly number[],
  total: number,
): RushWindow[] {
  if (hours.length === 0 || total === 0) return [];

  const size = Math.min(RUSH_WINDOW_HOURS, hours.length);
  const candidates: RushWindow[] = [];

  for (let start = 0; start + size <= hours.length; start += 1) {
    const run = hours.slice(start, start + size);
    const orders = run.reduce((sum, hour) => sum + hourTotals[hour], 0);
    candidates.push({
      fromHour: run[0],
      toHour: run[run.length - 1],
      orders,
      share: orders / total,
    });
  }

  candidates.sort((a, b) => b.orders - a.orders || a.fromHour - b.fromHour);

  const [best] = candidates;
  if (best.orders === 0) return [];

  const second = candidates.find(
    (window) => window.fromHour > best.toHour || window.toHour < best.fromHour,
  );

  return second && second.orders >= best.orders * SECOND_RUSH_RATIO
    ? [best, second].sort((a, b) => a.fromHour - b.fromHour)
    : [best];
}
