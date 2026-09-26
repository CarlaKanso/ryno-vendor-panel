import { describe, expect, it } from "vitest";

import {
  bucketKey,
  bucketRange,
  formatBucketLabel,
  formatDate,
  formatDateTime,
  formatHour12,
  formatHourRange,
  formatMonth,
  formatTime,
  isMonthKey,
  lastCompleteMonth,
  lastNDays,
  monthRange,
  parseDateKey,
  shiftMonth,
  toDateKey,
  weekdayIndex,
} from "@/lib/dates";

describe("formatDateTime", () => {
  it("uses the format the brief asks for", () => {
    expect(formatDateTime("2026-09-17T09:40:00.000Z")).toBe("17th Sep 2026 09:40 AM");
  });

  it("gets the ordinal suffixes right, including the teens", () => {
    const at = (day: string) => formatDate(`2026-09-${day}T00:00:00Z`);
    expect(at("01")).toBe("1st Sep 2026");
    expect(at("02")).toBe("2nd Sep 2026");
    expect(at("03")).toBe("3rd Sep 2026");
    expect(at("04")).toBe("4th Sep 2026");
    expect(at("11")).toBe("11th Sep 2026");
    expect(at("12")).toBe("12th Sep 2026");
    expect(at("13")).toBe("13th Sep 2026");
    expect(at("21")).toBe("21st Sep 2026");
    expect(at("22")).toBe("22nd Sep 2026");
    expect(at("23")).toBe("23rd Sep 2026");
  });

  it("reads noon and midnight as 12 PM and 12 AM", () => {
    expect(formatTime("2026-09-17T12:00:00Z")).toBe("12:00 PM");
    expect(formatTime("2026-09-17T00:05:00Z")).toBe("12:05 AM");
  });

  it("formats in UTC regardless of the machine's zone", () => {
    // 23:30 UTC is the next day in Sydney; Accra is UTC+0 and must not shift.
    expect(formatDateTime("2026-09-17T23:30:00.000Z")).toBe("17th Sep 2026 11:30 PM");
  });

  it("degrades to a dash rather than 'Invalid Date'", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime("not a date")).toBe("—");
  });
});

describe("lastNDays", () => {
  it("returns an inclusive window ending today", () => {
    const today = new Date("2026-09-21T15:00:00.000Z");
    expect(lastNDays(30, today)).toEqual({ from: "2026-08-23", to: "2026-09-21" });
  });

  it("handles a window that crosses a month boundary", () => {
    expect(lastNDays(7, new Date("2026-03-03T00:00:00Z"))).toEqual({
      from: "2026-02-25",
      to: "2026-03-03",
    });
  });
});

describe("bucketKey", () => {
  it("keys days, Monday-started weeks and months", () => {
    const thursday = "2026-09-03T18:00:00Z";
    expect(bucketKey(thursday, "daily")).toBe("2026-09-03");
    expect(bucketKey(thursday, "weekly")).toBe("2026-08-31");
    expect(bucketKey(thursday, "monthly")).toBe("2026-09");
  });

  it("keeps a Sunday in the week that started the Monday before it", () => {
    expect(bucketKey("2026-09-06T10:00:00Z", "weekly")).toBe("2026-08-31");
  });
});

describe("bucketRange", () => {
  it("covers every day inclusively", () => {
    const keys = bucketRange(
      parseDateKey("2026-09-01")!,
      parseDateKey("2026-09-04")!,
      "daily",
    );
    expect(keys).toEqual(["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"]);
  });

  it("starts the first week on its Monday, even mid-week", () => {
    const keys = bucketRange(
      parseDateKey("2026-09-03")!,
      parseDateKey("2026-09-16")!,
      "weekly",
    );
    expect(keys).toEqual(["2026-08-31", "2026-09-07", "2026-09-14"]);
  });

  it("returns a single bucket when from and to are the same day", () => {
    const day = parseDateKey("2026-09-05")!;
    expect(bucketRange(day, day, "daily")).toEqual(["2026-09-05"]);
  });
});

describe("misc helpers", () => {
  it("labels buckets readably", () => {
    expect(formatBucketLabel("2026-09", "monthly")).toBe("Sep 2026");
    expect(formatBucketLabel("2026-09-03", "daily")).toBe("3 Sep");
    expect(formatBucketLabel("2026-08-31", "weekly")).toBe("w/c 31 Aug");
  });

  it("rejects malformed date keys", () => {
    expect(parseDateKey("2026-9-3")).toBeNull();
    expect(parseDateKey("yesterday")).toBeNull();
    expect(parseDateKey("2026-09-03")).toBeInstanceOf(Date);
  });

  it("formats a Date back to a YYYY-MM-DD key", () => {
    expect(toDateKey(new Date("2026-09-03T23:59:00Z"))).toBe("2026-09-03");
  });
});

describe("hours and weekdays", () => {
  it("indexes weekdays with Monday first, in UTC", () => {
    // 14th Sep 2026 is a Monday; 20th Sep is the Sunday that closes that week.
    expect(weekdayIndex("2026-09-14T09:00:00.000Z")).toBe(0);
    expect(weekdayIndex("2026-09-19T09:00:00.000Z")).toBe(5);
    expect(weekdayIndex("2026-09-20T09:00:00.000Z")).toBe(6);
  });

  it("indexes the weekday in UTC, not the reader's zone", () => {
    // 23:30 UTC on Saturday is already Sunday in Sydney. Accra is UTC, so this
    // order belongs to Saturday — the same rule the KPIs bucket by.
    expect(weekdayIndex("2026-09-19T23:30:00.000Z")).toBe(5);
  });

  it("formats an hour the way a person says it", () => {
    expect(formatHour12(0)).toBe("12 AM");
    expect(formatHour12(7)).toBe("7 AM");
    expect(formatHour12(11)).toBe("11 AM");
    expect(formatHour12(12)).toBe("12 PM");
    expect(formatHour12(13)).toBe("1 PM");
    expect(formatHour12(23)).toBe("11 PM");
  });

  it("wraps an hour past midnight rather than printing nonsense", () => {
    expect(formatHour12(24)).toBe("12 AM");
    expect(formatHour12(25)).toBe("1 AM");
  });

  it("labels a run of hours with an exclusive end, like a shift", () => {
    // The hours 12, 13 and 14 cover 12:00 until 14:59, which reads as 12–3.
    expect(formatHourRange(12, 14)).toBe("12 PM – 3 PM");
    expect(formatHourRange(7, 9)).toBe("7 AM – 10 AM");
    expect(formatHourRange(22, 23)).toBe("10 PM – 12 AM");
  });
});

describe("month keys", () => {
  it("accepts YYYY-MM and nothing else", () => {
    expect(isMonthKey("2026-08")).toBe(true);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("2026-8")).toBe(false);
    expect(isMonthKey("2026-08-01")).toBe(false);
  });

  it("finds the last day of a month, leap years included", () => {
    expect(monthRange("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(monthRange("2024-02")).toEqual({ from: "2024-02-01", to: "2024-02-29" });
    expect(monthRange("2026-12")).toEqual({ from: "2026-12-01", to: "2026-12-31" });
  });

  it("shifts across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2025-12", 1)).toBe("2026-01");
    expect(shiftMonth("2026-08", -14)).toBe("2025-06");
  });

  it("opens the recap on the last month that has finished", () => {
    expect(lastCompleteMonth("2026-09-27")).toBe("2026-08");
    expect(lastCompleteMonth("2026-09-01")).toBe("2026-08");
    expect(lastCompleteMonth("2026-01-15")).toBe("2025-12");
  });

  it("spells the month out for a title", () => {
    expect(formatMonth("2026-08")).toBe("August 2026");
    expect(formatMonth("2025-12")).toBe("December 2025");
  });
});
