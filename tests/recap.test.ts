import { describe, expect, it } from "vitest";

import type { DashboardOrder, DashboardOrderItem } from "@/lib/analytics";
import type { Review } from "@/lib/api/types";
import {
  averageRating,
  bestReview,
  buildRecap,
  daysCovered,
  dropReport,
  percentChange,
} from "@/lib/recap";

function order(overrides: Partial<DashboardOrder> = {}): DashboardOrder {
  return {
    order_no: "1",
    status: "completed",
    created_at: "2026-08-10T09:00:00.000Z",
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
    item_id: "rice",
    name: "Rice 5kg",
    image_url: null,
    quantity: 1,
    line_total: 50,
    status: "available",
    main_category_id: null,
    category_id: null,
    sub_category_id: null,
    ...overrides,
  };
}

function review(overrides: Partial<Review> = {}): Review {
  return {
    id: "r1",
    rating: 5,
    comment: "Lovely",
    vendor_reply: null,
    replied_at: null,
    created_at: "2026-08-10T09:00:00.000Z",
    order_id: "o1",
    order_no: "1",
    shop: { id: "shop-osu", name: "Kaya Market – Osu" },
    customer: { id: "c1", full_name: "Ama Mensah" },
    ...overrides,
  };
}

describe("dropReport", () => {
  it("counts unavailable lines on completed orders and what they were worth", () => {
    const report = dropReport([
      order({
        order_no: "1",
        items: [
          item({ item_id: "rice", status: "not_available", line_total: 50 }),
          item({ item_id: "oil", name: "Oil", status: "available" }),
        ],
      }),
      order({
        order_no: "2",
        items: [
          item({ item_id: "rice", status: "not_available", line_total: 25.5 }),
          item({ item_id: "milk", name: "Milk", status: "not_available", line_total: 10 }),
        ],
      }),
      order({ order_no: "3", items: [item()] }),
    ]);

    expect(report.lines).toBe(3);
    expect(report.orders).toBe(2);
    // 50 + 25.50 + 10, summed in pesewas so it cannot drift.
    expect(report.value).toBe(85.5);
    expect(report.worst.map((entry) => [entry.name, entry.lines])).toEqual([
      ["Rice 5kg", 2],
      ["Milk", 1],
    ]);
  });

  it("ignores cancelled orders, whose lines were not lost to stock", () => {
    const report = dropReport([
      order({ status: "cancelled", items: [item({ status: "not_available" })] }),
      order({ status: "pending", items: [item({ status: "not_available" })] }),
    ]);

    expect(report).toEqual({ lines: 0, orders: 0, value: 0, worst: [] });
  });
});

describe("bestReview", () => {
  it("prefers the highest rating, then the one with the most to say", () => {
    const best = bestReview([
      review({ id: "a", rating: 5, comment: "Great." }),
      review({ id: "b", rating: 5, comment: "Great, and the rider was early." }),
      review({ id: "c", rating: 4, comment: "A very long and detailed four-star review." }),
    ]);

    expect(best?.id).toBe("b");
  });

  it("never quotes a review with nothing in it", () => {
    expect(bestReview([review({ comment: null }), review({ comment: "   " })])).toBeNull();
    expect(bestReview([review({ rating: 5, comment: null }), review({ rating: 3, comment: "Ok" })])?.rating).toBe(3);
  });
});

describe("small numbers", () => {
  it("compares against last month, or declines to when there was none", () => {
    expect(percentChange(78, 70)).toBeCloseTo(0.114, 3);
    expect(percentChange(60, 80)).toBeCloseTo(-0.25, 3);
    expect(percentChange(10, 0)).toBeNull();
  });

  it("averages ratings to one decimal, and refuses to call an empty month a zero", () => {
    expect(averageRating([review({ rating: 5 }), review({ rating: 4 })])).toBe(4.5);
    expect(averageRating([review({ rating: 5 }), review({ rating: 4 }), review({ rating: 5 })])).toBe(4.7);
    expect(averageRating([])).toBeNull();
  });

  it("counts only the days of a month that have happened", () => {
    expect(daysCovered("2026-08", "2026-09-27")).toBe(31);
    expect(daysCovered("2026-09", "2026-09-14")).toBe(14);
    expect(daysCovered("2026-02", "2026-09-27")).toBe(28);
    expect(daysCovered("2026-10", "2026-09-27")).toBe(0);
  });
});

describe("buildRecap", () => {
  it("assembles the month from the tested analytics", () => {
    const orders = [
      order({ order_no: "1", total: 100, items: [item({ quantity: 3 })] }),
      order({ order_no: "2", total: 200, shop_id: "shop-legon", shop_name: "Kaya Market – East Legon" }),
      order({ order_no: "3", status: "cancelled", total: 50 }),
    ];
    const previous = [order({ order_no: "p1" }), order({ order_no: "p2" })];

    const recap = buildRecap({
      month: "2026-08",
      today: "2026-09-27",
      orders,
      previousOrders: previous,
      reviews: [review({ rating: 5 }), review({ id: "r2", rating: 4, comment: null })],
      vendorName: "Kaya Market",
      currency: "GHS",
    });

    expect(recap.label).toBe("August 2026");
    expect(recap.previousLabel).toBe("July 2026");
    expect(recap.kpis.totalOrders).toBe(3);
    expect(recap.change).toBeCloseTo(0.5, 3);
    // 31 days × 24 hours over 3 orders.
    expect(recap.hoursPerOrder).toBeCloseTo(248, 3);
    expect(recap.items[0]).toMatchObject({ name: "Rice 5kg", quantity: 3 });
    expect(recap.shops[0]).toMatchObject({ name: "Kaya Market – East Legon" });
    // 200 of the 300 completed sales.
    expect(recap.leadShare).toBeCloseTo(2 / 3, 3);
    expect(recap.reviews).toMatchObject({ count: 2, average: 4.5 });
    expect(recap.reviews.best?.rating).toBe(5);
    // The month is read as itself, never widened to all time.
    expect(recap.rush.source).toBe("range");
    expect(recap.rush.span).toEqual({ from: "2026-08-01", to: "2026-08-31" });
  });

  it("has nothing to say about a month with no orders, without dividing by zero", () => {
    const recap = buildRecap({
      month: "2026-08",
      today: "2026-09-27",
      orders: [],
      previousOrders: [],
      reviews: [],
      vendorName: "Kaya Market",
      currency: "GHS",
    });

    expect(recap.kpis.totalOrders).toBe(0);
    expect(recap.change).toBeNull();
    expect(recap.hoursPerOrder).toBeNull();
    expect(recap.leadShare).toBeNull();
    expect(recap.reviews.average).toBeNull();
    expect(recap.rush.total).toBe(0);
  });
});
