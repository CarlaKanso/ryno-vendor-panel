import { describe, expect, it } from "vitest";

import {
  buildRevenueSeries,
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
