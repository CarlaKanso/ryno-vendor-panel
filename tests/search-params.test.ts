import { describe, expect, it } from "vitest";

import {
  ARCHIVED_MODES,
  buildQuery,
  ORDER_SORTS,
  readDateRange,
  readEnum,
  readInt,
  readPerPage,
  readStatuses,
  readString,
} from "@/lib/search-params";

describe("reading URL state", () => {
  it("treats blank and whitespace params as absent", () => {
    expect(readString({ q: "" }, "q")).toBeUndefined();
    expect(readString({ q: "   " }, "q")).toBeUndefined();
    expect(readString({ q: " rice " }, "q")).toBe("rice");
  });

  it("takes the first value when a param is repeated", () => {
    expect(readString({ shop_id: ["a", "b"] }, "shop_id")).toBe("a");
  });

  it("clamps integers and falls back on nonsense", () => {
    expect(readInt({ page: "3" }, "page", 1)).toBe(3);
    expect(readInt({ page: "0" }, "page", 1)).toBe(1);
    expect(readInt({ page: "-5" }, "page", 1)).toBe(1);
    expect(readInt({ page: "banana" }, "page", 1)).toBe(1);
    expect(readInt({ rating: "9" }, "rating", 1, { min: 1, max: 5 })).toBe(5);
  });

  it("only accepts page sizes the UI offers", () => {
    expect(readPerPage({ per_page: "50" })).toBe(50);
    expect(readPerPage({ per_page: "7" })).toBe(10);
    expect(readPerPage({})).toBe(10);
  });

  it("drops statuses that are not real order statuses", () => {
    expect(readStatuses({ status: "pending,banana,completed" })).toEqual([
      "pending",
      "completed",
    ]);
    expect(readStatuses({})).toEqual([]);
  });

  it("falls back when an enum param is tampered with", () => {
    expect(readEnum({ sort: "-total" }, "sort", ORDER_SORTS, "-created_at")).toBe("-total");
    expect(readEnum({ sort: "DROP TABLE" }, "sort", ORDER_SORTS, "-created_at")).toBe(
      "-created_at",
    );
    expect(readEnum({}, "archived", ARCHIVED_MODES, "exclude")).toBe("exclude");
  });
});

describe("readDateRange", () => {
  const today = new Date("2026-09-21T10:00:00Z");

  it("defaults to the last 30 days", () => {
    expect(readDateRange({}, today)).toEqual({ from: "2026-08-23", to: "2026-09-21" });
  });

  it("uses the URL when it holds valid dates", () => {
    expect(readDateRange({ from: "2026-01-01", to: "2026-02-01" }, today)).toEqual({
      from: "2026-01-01",
      to: "2026-02-01",
    });
  });

  it("ignores a malformed date and falls back to the default for it", () => {
    expect(readDateRange({ from: "01/01/2026", to: "2026-09-10" }, today)).toEqual({
      from: "2026-08-23",
      to: "2026-09-10",
    });
  });

  it("swaps a backwards range rather than showing nothing", () => {
    expect(readDateRange({ from: "2026-09-10", to: "2026-09-01" }, today)).toEqual({
      from: "2026-09-01",
      to: "2026-09-10",
    });
  });
});

describe("buildQuery", () => {
  it("sets, replaces and removes params", () => {
    const current = new URLSearchParams("shop_id=a&status=pending");
    expect(buildQuery(current, { status: "completed" })).toBe(
      "?shop_id=a&status=completed",
    );
    expect(buildQuery(current, { shop_id: null })).toBe("?status=pending");
  });

  it("resets the page when a filter changes", () => {
    const current = new URLSearchParams("page=7&q=rice");
    expect(buildQuery(current, { q: "oil" })).toBe("?q=oil");
  });

  it("keeps the page when the page itself is what changed", () => {
    const current = new URLSearchParams("page=7&q=rice");
    expect(buildQuery(current, { page: 8 })).toBe("?page=8&q=rice");
  });

  it("keeps pagination when asked to, which is how the pager navigates", () => {
    const current = new URLSearchParams("page=7&q=rice");
    expect(buildQuery(current, { sort: "-total" }, { resetPage: false })).toBe(
      "?page=7&q=rice&sort=-total",
    );
  });

  it("returns an empty string rather than a bare question mark", () => {
    expect(buildQuery(new URLSearchParams("q=rice"), { q: null })).toBe("");
  });
});
