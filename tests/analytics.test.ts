import { describe, expect, it } from "vitest";

import {
  buildRevenueSeries,
  buildRushHours,
  computeKpis,
  filterOrders,
  suggestGranularity,
  topItems,
  topShops,
  type DashboardOrder,
  type DashboardOrderItem,
} from "@/lib/analytics";

/** Builds a dashboard order, so each test only states what it cares about. */
function order(overrides: Partial<DashboardOrder> = {}): DashboardOrder {
  return {
    order_no: "1",
    status: "completed",
    created_at: "2026-09-10T09:00:00.000Z",
    shop_id: "shop-osu",
    shop_name: "Kaya Market – Osu",
    total: 100,
    vendor_earnings: 80,
    items: [],
    ...overrides,
  };
}

function item(overrides: Partial<DashboardOrderItem> = {}): DashboardOrderItem {
  return {
    item_id: "item-rice",
    name: "Rice 5kg",
    image_url: null,
    quantity: 1,
    line_total: 50,
    status: "available",
    main_category_id: "main-food",
    category_id: "cat-staples",
    sub_category_id: "sub-rice",
    ...overrides,
  };
}

describe("computeKpis", () => {
  it("applies the definitions from the brief", () => {
    const orders = [
      order({ order_no: "1", status: "completed", total: 675, vendor_earnings: 580.8 }),
      order({ order_no: "2", status: "completed", total: 1410, vendor_earnings: 1232 }),
      order({ order_no: "3", status: "cancelled", total: 500, vendor_earnings: 440 }),
      order({ order_no: "4", status: "pending", total: 300, vendor_earnings: 264 }),
      order({ order_no: "5", status: "refunded", total: 220, vendor_earnings: 193.6 }),
    ];

    expect(computeKpis(orders)).toEqual({
      totalOrders: 5,
      delivered: 2,
      cancelled: 1,
      totalSales: 2085,
      revenue: 1812.8,
    });
  });

  it("counts only completed orders towards money, whatever the other statuses hold", () => {
    // Cancelled and refunded orders still carry money fields; they must not
    // reach Total Sales or Revenue.
    const orders = [
      order({ status: "cancelled", total: 9999, vendor_earnings: 9999 }),
      order({ status: "refunded", total: 8888, vendor_earnings: 8888 }),
      order({ status: "on_the_way", total: 7777, vendor_earnings: 7777 }),
    ];

    const kpis = computeKpis(orders);
    expect(kpis.totalSales).toBe(0);
    expect(kpis.revenue).toBe(0);
    expect(kpis.totalOrders).toBe(3);
  });

  it("adds money without floating-point drift", () => {
    const orders = Array.from({ length: 3 }, () =>
      order({ total: 0.1, vendor_earnings: 79.2 }),
    );
    expect(computeKpis(orders).totalSales).toBe(0.3);
    expect(computeKpis(orders).revenue).toBe(237.6);
  });

  it("returns zeros for an empty list rather than NaN", () => {
    expect(computeKpis([])).toEqual({
      totalOrders: 0,
      delivered: 0,
      cancelled: 0,
      totalSales: 0,
      revenue: 0,
    });
  });
});

describe("filterOrders", () => {
  const orders = [
    order({ order_no: "osu", shop_id: "shop-osu", created_at: "2026-09-01T12:00:00Z" }),
    order({
      order_no: "madina",
      shop_id: "shop-madina",
      created_at: "2026-09-15T12:00:00Z",
      items: [item({ main_category_id: "main-home", category_id: "cat-decor", sub_category_id: "sub-art" })],
    }),
  ];

  it("filters by shop", () => {
    expect(filterOrders(orders, { shopId: "shop-osu" }).map((o) => o.order_no)).toEqual([
      "osu",
    ]);
  });

  it("includes the whole of the `to` day", () => {
    const late = order({
      order_no: "late",
      created_at: "2026-09-15T23:59:59.999Z",
    });
    const result = filterOrders([late], { from: "2026-09-15", to: "2026-09-15" });
    expect(result).toHaveLength(1);
  });

  it("excludes the day after `to`", () => {
    const nextDay = order({
      order_no: "next",
      created_at: "2026-09-16T00:00:00.000Z",
    });
    expect(filterOrders([nextDay], { from: "2026-09-15", to: "2026-09-15" })).toHaveLength(
      0,
    );
  });

  it("matches a category when any line sits under it", () => {
    const mixed = order({
      order_no: "mixed",
      items: [
        item({ main_category_id: "main-food" }),
        item({ item_id: "item-lamp", main_category_id: "main-home" }),
      ],
    });

    expect(filterOrders([mixed], { mainCategoryId: "main-home" })).toHaveLength(1);
    expect(filterOrders([mixed], { mainCategoryId: "main-beauty" })).toHaveLength(0);
  });

  it("uses the most specific category level that is set", () => {
    expect(
      filterOrders(orders, {
        mainCategoryId: "main-home",
        categoryId: "cat-decor",
        subCategoryId: "sub-nothing",
      }),
    ).toHaveLength(0);
  });

  it("returns everything when no filters are set", () => {
    expect(filterOrders(orders, {})).toHaveLength(2);
  });
});

describe("buildRevenueSeries", () => {
  it("emits a zero for every day with no sales instead of skipping it", () => {
    const series = buildRevenueSeries(
      [order({ created_at: "2026-09-03T08:00:00Z", vendor_earnings: 120 })],
      { from: "2026-09-01", to: "2026-09-05" },
      "daily",
    );

    expect(series).toHaveLength(5);
    expect(series.map((point) => point.revenue)).toEqual([0, 0, 120, 0, 0]);
    expect(series.map((point) => point.key)).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
    ]);
  });

  it("buckets weeks from the Monday", () => {
    // 2026-09-03 is a Thursday; its week starts Monday 2026-08-31.
    const series = buildRevenueSeries(
      [order({ created_at: "2026-09-03T08:00:00Z", vendor_earnings: 50 })],
      { from: "2026-08-31", to: "2026-09-13" },
      "weekly",
    );

    expect(series.map((point) => point.key)).toEqual(["2026-08-31", "2026-09-07"]);
    expect(series[0].revenue).toBe(50);
    expect(series[1].revenue).toBe(0);
  });

  it("buckets months across a year boundary", () => {
    const series = buildRevenueSeries([], { from: "2025-11-04", to: "2026-02-20" }, "monthly");
    expect(series.map((point) => point.key)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });

  it("counts only completed orders", () => {
    const series = buildRevenueSeries(
      [
        order({ created_at: "2026-09-02T08:00:00Z", status: "cancelled", vendor_earnings: 900 }),
        order({ created_at: "2026-09-02T09:00:00Z", status: "completed", vendor_earnings: 40 }),
      ],
      { from: "2026-09-02", to: "2026-09-02" },
      "daily",
    );

    expect(series[0]).toMatchObject({ revenue: 40, orders: 1 });
  });

  it("ignores orders outside the requested range", () => {
    const series = buildRevenueSeries(
      [order({ created_at: "2026-01-01T08:00:00Z", vendor_earnings: 999 })],
      { from: "2026-09-01", to: "2026-09-02" },
      "daily",
    );
    expect(series.every((point) => point.revenue === 0)).toBe(true);
  });

  it("returns nothing for a backwards range", () => {
    expect(buildRevenueSeries([], { from: "2026-09-10", to: "2026-09-01" }, "daily")).toEqual(
      [],
    );
  });
});

describe("topShops", () => {
  it("ranks by total sales on completed orders", () => {
    const orders = [
      order({ shop_id: "a", shop_name: "Osu", total: 100 }),
      order({ shop_id: "a", shop_name: "Osu", total: 50 }),
      order({ shop_id: "b", shop_name: "Madina", total: 300 }),
      order({ shop_id: "b", shop_name: "Madina", status: "cancelled", total: 5000 }),
    ];

    expect(topShops(orders)).toEqual([
      { shopId: "b", name: "Madina", totalSales: 300, orders: 1 },
      { shopId: "a", name: "Osu", totalSales: 150, orders: 2 },
    ]);
  });

  it("honours the limit", () => {
    const orders = ["a", "b", "c"].map((id, index) =>
      order({ shop_id: id, shop_name: id, total: (index + 1) * 10 }),
    );
    expect(topShops(orders, 2)).toHaveLength(2);
  });
});

describe("topItems", () => {
  it("counts quantity on available lines of completed orders only", () => {
    const orders = [
      order({
        items: [
          item({ item_id: "rice", quantity: 3, line_total: 150 }),
          item({ item_id: "oil", quantity: 1, line_total: 40 }),
        ],
      }),
      order({
        items: [item({ item_id: "rice", quantity: 2, line_total: 100 })],
      }),
      // Not available: picked but never sold.
      order({
        items: [item({ item_id: "oil", quantity: 9, line_total: 360, status: "not_available" })],
      }),
      // Cancelled: nothing on it counts.
      order({
        status: "cancelled",
        items: [item({ item_id: "rice", quantity: 99, line_total: 4950 })],
      }),
    ];

    expect(topItems(orders)).toEqual([
      { itemId: "rice", name: "Rice 5kg", imageUrl: null, quantity: 5, revenue: 250 },
      { itemId: "oil", name: "Rice 5kg", imageUrl: null, quantity: 1, revenue: 40 },
    ]);
  });

  it("returns an empty ranking when nothing sold", () => {
    expect(topItems([order({ status: "pending", items: [item()] })])).toEqual([]);
  });
});

describe("suggestGranularity", () => {
  it("picks a granularity that keeps the bar count readable", () => {
    expect(suggestGranularity({ from: "2026-08-23", to: "2026-09-21" })).toBe("daily");
    expect(suggestGranularity({ from: "2026-03-01", to: "2026-09-21" })).toBe("weekly");
    expect(suggestGranularity({ from: "2025-03-01", to: "2026-09-21" })).toBe("monthly");
  });
});

describe("buildRushHours", () => {
  /** `count` identical orders placed at the same instant. */
  function placed(count: number, iso: string, overrides: Partial<DashboardOrder> = {}) {
    return Array.from({ length: count }, (_, index) =>
      order({ order_no: `${iso}-${index}`, created_at: iso, ...overrides }),
    );
  }

  // 14th Sep 2026 is a Monday, so the 19th is Saturday and the 20th Sunday.
  const MON_7AM = "2026-09-14T07:00:00.000Z";
  const SAT_1PM = "2026-09-19T13:00:00.000Z";
  const SUN_8PM = "2026-09-20T20:00:00.000Z";

  /** The subject under test, with widening switched off unless a test wants it. */
  function grid(orders: DashboardOrder[]) {
    return buildRushHours(orders, orders, { minOrders: 1 });
  }

  it("buckets orders into weekday rows, Monday first, and hour columns", () => {
    const rush = grid([...placed(2, MON_7AM), ...placed(3, SAT_1PM)]);

    expect(rush.total).toBe(5);
    expect(rush.max).toBe(3);
    expect(rush.hours).toEqual([7, 8, 9, 10, 11, 12, 13]);
    expect(rush.rows).toHaveLength(7);

    const monday7 = rush.rows[0][0];
    expect(monday7).toMatchObject({ day: 0, hour: 7, orders: 2 });

    const saturday1pm = rush.rows[5].at(-1);
    expect(saturday1pm).toMatchObject({ day: 5, hour: 13, orders: 3 });

    // Every other slot is empty, and an empty slot is level 0.
    expect(rush.rows[2].every((cell) => cell.orders === 0 && cell.level === 0)).toBe(true);
  });

  it("counts every status, because a cancelled order still arrived at that hour", () => {
    const rush = grid([
      ...placed(1, SAT_1PM, { status: "completed" }),
      ...placed(1, SAT_1PM, { status: "cancelled" }),
      ...placed(1, SAT_1PM, { status: "refunded" }),
      ...placed(1, SAT_1PM, { status: "pending" }),
    ]);

    // Contrast with computeKpis, where only `completed` reaches Total Sales:
    // a staffing pattern is about demand, not money.
    expect(rush.total).toBe(4);
    expect(rush.peak).toMatchObject({ day: 5, hour: 13, orders: 4 });
  });

  it("trims the hours nobody orders in rather than drawing a dead night", () => {
    const rush = grid([...placed(1, SAT_1PM), ...placed(1, SUN_8PM)]);

    // 13:00 to 20:00 inclusive — nothing before, nothing after, no 24 columns.
    expect(rush.hours).toEqual([13, 14, 15, 16, 17, 18, 19, 20]);
    expect(rush.rows[0]).toHaveLength(8);
  });

  it("shades relative to the busiest slot, and never shades one order as empty", () => {
    const rush = grid([...placed(10, SAT_1PM), ...placed(1, MON_7AM)]);

    expect(rush.max).toBe(10);
    expect(rush.rows[5].at(-1)?.level).toBe(5);
    expect(rush.rows[0][0]).toMatchObject({ orders: 1, level: 1 });
  });

  it("widens to every order when the selected range is too thin to read", () => {
    const inRange = placed(10, SAT_1PM);
    const allTime = [...inRange, ...placed(40, MON_7AM)];

    const rush = buildRushHours(inRange, allTime, { minOrders: 300 });

    expect(rush.widened).toBe(true);
    expect(rush.total).toBe(50);
    // The card says what it chose and what the filter actually held.
    expect(rush.rangeTotal).toBe(10);
  });

  it("does not claim to have widened when there is nothing more to widen to", () => {
    const orders = placed(10, SAT_1PM);

    const rush = buildRushHours(orders, orders, { minOrders: 300 });

    expect(rush.widened).toBe(false);
    expect(rush.total).toBe(10);
  });

  it("keeps the selected range when it holds enough orders", () => {
    const inRange = placed(300, SAT_1PM);
    const allTime = [...inRange, ...placed(500, MON_7AM)];

    const rush = buildRushHours(inRange, allTime, { minOrders: 300 });

    expect(rush.widened).toBe(false);
    expect(rush.total).toBe(300);
  });

  it("names both rushes when the day has two, in clock order", () => {
    const rush = grid([
      ...placed(30, "2026-09-19T12:00:00.000Z"),
      ...placed(20, "2026-09-19T13:00:00.000Z"),
      ...placed(25, "2026-09-19T19:00:00.000Z"),
      ...placed(15, "2026-09-19T20:00:00.000Z"),
    ]);

    expect(rush.rushes).toHaveLength(2);
    expect(rush.rushes.map((window) => [window.fromHour, window.toHour])).toEqual([
      [12, 14],
      [18, 20],
    ]);
    expect(rush.rushes[0].orders).toBe(50);
    expect(rush.rushes[1].orders).toBe(40);
  });

  it("names only one stretch when the second is too small to staff for", () => {
    const rush = grid([
      ...placed(40, "2026-09-19T12:00:00.000Z"),
      ...placed(2, "2026-09-19T20:00:00.000Z"),
    ]);

    expect(rush.rushes).toHaveLength(1);
    expect(rush.rushes[0]).toMatchObject({ orders: 40 });
  });

  it("reports the busiest day and the span it read", () => {
    const rush = grid([...placed(3, SAT_1PM), ...placed(1, MON_7AM)]);

    expect(rush.busiestDay).toEqual({ day: 5, orders: 3, share: 0.75 });
    expect(rush.span).toEqual({ from: "2026-09-14", to: "2026-09-19" });
  });

  it("obeys an explicit 'this range', however thin, without calling it widened", () => {
    const inRange = placed(10, SAT_1PM);
    const allTime = [...inRange, ...placed(500, MON_7AM)];

    const rush = buildRushHours(inRange, allTime, { scope: "range", minOrders: 300 });

    // The vendor asked for February; February is what they get.
    expect(rush.source).toBe("range");
    expect(rush.total).toBe(10);
    // `widened` is reserved for the card overriding them on its own, so the
    // footnote apologises for the right thing.
    expect(rush.widened).toBe(false);
  });

  it("obeys an explicit 'all time' even when the range was big enough", () => {
    const inRange = placed(400, SAT_1PM);
    const allTime = [...inRange, ...placed(500, MON_7AM)];

    const rush = buildRushHours(allTime.slice(0, 400), allTime, {
      scope: "all",
      minOrders: 300,
    });

    expect(rush.source).toBe("all");
    expect(rush.total).toBe(900);
    expect(rush.widened).toBe(false);
    expect(inRange).toHaveLength(400);
  });

  it("reports both totals so the toggle can show what each side holds", () => {
    const inRange = placed(10, SAT_1PM);
    const allTime = [...inRange, ...placed(40, MON_7AM)];

    const rush = buildRushHours(inRange, allTime);

    expect(rush.rangeTotal).toBe(10);
    expect(rush.allTimeTotal).toBe(50);
  });

  it("divides by the days asked about, not just the days that held an order", () => {
    // The regression: 1st Jan to 28th Feb holds 8 Mondays, but orders land on
    // only two of them. Dividing by the observed span reported 3.0 per Monday
    // where the honest figure over the window asked about is 0.8.
    const orders = [
      ...placed(3, "2026-02-16T12:00:00.000Z"),
      ...placed(3, "2026-02-23T12:00:00.000Z"),
    ];

    const rush = buildRushHours(orders, orders, {
      minOrders: 1,
      range: { from: "2026-01-01", to: "2026-02-28" },
      today: "2026-09-27",
    });

    expect(rush.dayOccurrences[0]).toBe(8);
    expect(rush.dayTotals[0]).toBe(6);
    expect(rush.dayTotals[0] / rush.dayOccurrences[0]).toBeCloseTo(0.75, 2);
    // And the window it reports is the one it divided by.
    expect(rush.span).toEqual({ from: "2026-01-01", to: "2026-02-28" });
  });

  it("does not count days that have not happened yet", () => {
    // Asking for "this month" on the 14th must not divide by the whole month:
    // the Mondays still to come are not Mondays anybody failed to sell on.
    const orders = placed(2, MON_7AM);

    const rush = buildRushHours(orders, orders, {
      minOrders: 1,
      range: { from: "2026-09-01", to: "2026-09-30" },
      today: "2026-09-14",
    });

    expect(rush.span).toEqual({ from: "2026-09-01", to: "2026-09-14" });
    // 7th and 14th September are the Mondays that have been.
    expect(rush.dayOccurrences[0]).toBe(2);
  });

  it("counts quiet days before a vendor's first order, rather than hiding them", () => {
    // Trimming the front would flatter the average. Two orders on one Monday
    // inside a four-Monday window is 0.5 a Monday, not 2.
    const orders = placed(2, MON_7AM);

    const rush = buildRushHours(orders, orders, {
      minOrders: 1,
      range: { from: "2026-08-24", to: "2026-09-14" },
      today: "2026-09-27",
    });

    expect(rush.dayOccurrences[0]).toBe(4);
    expect(rush.dayTotals[0] / rush.dayOccurrences[0]).toBe(0.5);
  });

  it("measures an all-time grid over its own span, not the selected range", () => {
    const inRange = placed(1, SAT_1PM);
    const allTime = [...inRange, ...placed(40, MON_7AM)];

    const rush = buildRushHours(inRange, allTime, {
      scope: "all",
      range: { from: "2026-09-19", to: "2026-09-19" },
      today: "2026-09-27",
    });

    // "All time" has no bounds but the data's own, so the one-day range is
    // ignored rather than used as a denominator.
    expect(rush.source).toBe("all");
    expect(rush.span).toEqual({ from: "2026-09-14", to: "2026-09-19" });
  });

  it("flags a thin sample against the threshold the grid was built with", () => {
    const orders = placed(10, SAT_1PM);

    // The card must not recompute this against its own constant: a caller that
    // lowers the bar lowers the caveat with it.
    expect(buildRushHours(orders, orders, { scope: "range" }).thin).toBe(true);
    expect(
      buildRushHours(orders, orders, { scope: "range", minOrders: 5 }).thin,
    ).toBe(false);
    // Never thin when the grid widened — that state has its own explanation.
    expect(buildRushHours(orders, [...orders, ...placed(500, MON_7AM)]).thin).toBe(false);
  });

  it("counts how many of each weekday the span holds, as the average's denominator", () => {
    // Mon 14th Sep to Sun 20th Sep is exactly one of each weekday.
    const rush = grid([...placed(1, MON_7AM), ...placed(3, SUN_8PM)]);

    expect(rush.span).toEqual({ from: "2026-09-14", to: "2026-09-20" });
    expect(rush.dayOccurrences).toEqual([1, 1, 1, 1, 1, 1, 1]);
  });

  it("counts partial weeks honestly, so two rows are not assumed alike", () => {
    // 14th Sep to 21st Sep is eight days: two Mondays, one of everything else.
    // This is the real case — 79 Tuesdays but 78 Saturdays over 18 months.
    const rush = grid([
      ...placed(1, MON_7AM),
      ...placed(1, "2026-09-21T07:00:00.000Z"),
      ...placed(1, SAT_1PM),
    ]);

    expect(rush.dayOccurrences).toEqual([2, 1, 1, 1, 1, 1, 1]);
    expect(rush.dayTotals[0]).toBe(2);
  });

  it("reports zero occurrences for weekdays a short window never reaches", () => {
    // Mon 14th to Thu 17th Sep: Friday, Saturday and Sunday do not occur, and
    // the footnote reads its range straight off this array.
    const orders = [...placed(1, MON_7AM), ...placed(1, "2026-09-17T09:00:00.000Z")];

    const rush = buildRushHours(orders, orders, {
      minOrders: 1,
      range: { from: "2026-09-14", to: "2026-09-17" },
      today: "2026-09-27",
    });

    expect(rush.dayOccurrences).toEqual([1, 1, 1, 1, 0, 0, 0]);
  });

  it("counts weekdays the same as walking the calendar, for every shape of span", () => {
    // `countWeekdays` is arithmetic rather than a day-by-day walk, because
    // `?from=0001-01-01` would otherwise spin 740,000 times per request. This
    // pins the arithmetic against the obvious-but-slow version it replaced.
    const walk = (from: string, to: string) => {
      const counts = [0, 0, 0, 0, 0, 0, 0];
      const end = new Date(`${to}T00:00:00.000Z`);
      for (
        const cursor = new Date(`${from}T00:00:00.000Z`);
        cursor <= end;
        cursor.setUTCDate(cursor.getUTCDate() + 1)
      ) {
        counts[(cursor.getUTCDay() + 6) % 7] += 1;
      }
      return counts;
    };

    const spans: Array<[string, string]> = [
      ["2026-09-14", "2026-09-14"], // one day
      ["2026-09-14", "2026-09-20"], // one whole week
      ["2026-09-14", "2026-09-21"], // a week and a day
      ["2026-09-01", "2026-09-26"], // a part month
      ["2026-02-01", "2026-02-28"], // February, four whole weeks
      ["2024-02-01", "2024-03-01"], // across a leap day
      ["2025-12-29", "2026-01-04"], // across a year boundary
      ["2025-03-18", "2026-09-17"], // the vendor's real span
    ];

    for (const [from, to] of spans) {
      const orders = [
        order({ created_at: `${from}T09:00:00.000Z` }),
        order({ order_no: "2", created_at: `${to}T09:00:00.000Z` }),
      ];
      const rush = buildRushHours(orders, orders, {
        minOrders: 1,
        range: { from, to },
        today: "2030-01-01",
      });

      expect(rush.dayOccurrences, `${from} → ${to}`).toEqual(walk(from, to));
    }
  });

  it("has no denominator to offer when there are no orders", () => {
    expect(buildRushHours([], []).dayOccurrences).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("comes back empty rather than dividing by zero", () => {
    const rush = buildRushHours([], []);

    expect(rush).toMatchObject({
      total: 0,
      max: 0,
      hours: [],
      peak: null,
      rushes: [],
      busiestDay: null,
      span: null,
      widened: false,
    });
  });
});
