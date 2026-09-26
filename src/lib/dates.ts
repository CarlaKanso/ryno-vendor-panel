/**
 * Date helpers.
 *
 * Every timestamp from the API is ISO 8601 in UTC, and Accra is UTC+0, so all
 * formatting and all bucketing is done in UTC. Formatting in the browser's
 * local zone would move an order across a day boundary for anyone outside
 * Ghana and quietly shift a KPI.
 */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function ordinal(day: number): string {
  if (day > 3 && day < 21) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

/** `"17th Sep 2026 09:40 AM"` — the format the brief asks for. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  const hours24 = date.getUTCHours();
  const meridiem = hours24 < 12 ? "AM" : "PM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${ordinal(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()} ${String(
    hours12,
  ).padStart(2, "0")}:${minutes} ${meridiem}`;
}

/** `"17th Sep 2026"`. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return `${ordinal(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** `"09:40 AM"`. */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const hours24 = date.getUTCHours();
  const meridiem = hours24 < 12 ? "AM" : "PM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${String(hours12).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")} ${meridiem}`;
}

/** `YYYY-MM-DD` in UTC — the shape the API's date filters accept. */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDateKey(key: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const date = new Date(`${key}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * The default dashboard window: the last 30 days, inclusive of today.
 *
 * `today` is a parameter rather than a `new Date()` inside, both because the
 * brief warns against assuming a specific "today" and because a function that
 * reads the clock cannot be tested.
 */
export function lastNDays(n: number, today: Date): { from: string; to: string } {
  return { from: toDateKey(addDays(today, -(n - 1))), to: toDateKey(today) };
}

export type Granularity = "daily" | "weekly" | "monthly";

/**
 * The bucket an instant falls into, as a sortable key.
 * Weeks start on Monday, matching how the rest of Accra reads a trading week.
 */
export function bucketKey(iso: string, granularity: Granularity): string {
  const date = new Date(iso);
  if (granularity === "monthly") return toDateKey(date).slice(0, 7);
  if (granularity === "weekly") {
    const day = date.getUTCDay(); // 0 = Sunday
    const daysSinceMonday = (day + 6) % 7;
    return toDateKey(addDays(date, -daysSinceMonday));
  }
  return toDateKey(date);
}

/**
 * Every bucket between `from` and `to` inclusive, so a period with no sales
 * renders as a zero rather than disappearing from the chart.
 */
export function bucketRange(from: Date, to: Date, granularity: Granularity): string[] {
  const keys: string[] = [];

  if (granularity === "monthly") {
    const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
    while (cursor <= end) {
      keys.push(toDateKey(cursor).slice(0, 7));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return keys;
  }

  const step = granularity === "weekly" ? 7 : 1;
  let cursor =
    granularity === "weekly"
      ? parseDateKey(bucketKey(from.toISOString(), "weekly"))!
      : new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));

  while (cursor <= to) {
    keys.push(toDateKey(cursor));
    cursor = addDays(cursor, step);
  }
  return keys;
}

/** Human label for a bucket key, e.g. `"2026-09"` → `"Sep 2026"`. */
export function formatBucketLabel(key: string, granularity: Granularity): string {
  if (granularity === "monthly") {
    const [year, month] = key.split("-");
    return `${MONTHS[Number(month) - 1]} ${year}`;
  }
  const date = parseDateKey(key);
  if (!date) return key;
  const label = `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
  return granularity === "weekly" ? `w/c ${label}` : label;
}

/**
 * Weekday names, Monday first.
 *
 * Monday first rather than Sunday first for the same reason `bucketKey` starts
 * its weeks there: a trading week in Accra runs Monday to Sunday, and the
 * weekend belongs at the end of the row where the eye expects the peak.
 */
export const WEEKDAYS = [
  { short: "Mon", long: "Monday" },
  { short: "Tue", long: "Tuesday" },
  { short: "Wed", long: "Wednesday" },
  { short: "Thu", long: "Thursday" },
  { short: "Fri", long: "Friday" },
  { short: "Sat", long: "Saturday" },
  { short: "Sun", long: "Sunday" },
] as const;

/** The weekday an instant falls on, `0` = Monday, in UTC. */
export function weekdayIndex(iso: string): number {
  return (new Date(iso).getUTCDay() + 6) % 7;
}

/** `13` → `"1 PM"`. Prose; the heatmap's own axis stays on the 24-hour clock. */
export function formatHour12(hour: number): string {
  const h = ((Math.trunc(hour) % 24) + 24) % 24;
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve} ${h < 12 ? "AM" : "PM"}`;
}

/**
 * A run of whole hours, read the way a shift is spoken: `(12, 14)` — the hours
 * 12:00 to 14:59 — is `"12 PM – 3 PM"`. The end hour is inclusive in the data
 * and exclusive in the label, which is what makes the label match the clock.
 */
export function formatHourRange(fromHour: number, toHour: number): string {
  return `${formatHour12(fromHour)} – ${formatHour12(toHour + 1)}`;
}

/* ---------------------------------------------------------------------------
   Month keys — `YYYY-MM`, the unit the monthly recap works in.
--------------------------------------------------------------------------- */

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function isMonthKey(key: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(key);
}

/** `"2026-08"` → `"August 2026"`. */
export function formatMonth(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${MONTHS_LONG[month - 1]} ${year}`;
}

/** The first and last day of a month, as date keys. */
export function monthRange(key: string): { from: string; to: string } {
  const [year, month] = key.split("-").map(Number);
  // Day 0 of the following month is the last day of this one — which is how
  // February sorts out its own leap years without a table.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${key}-01`, to: `${key}-${String(lastDay).padStart(2, "0")}` };
}

/** `"2026-01"` shifted by `-1` is `"2025-12"`; `Date.UTC` carries the year. */
export function shiftMonth(key: string, delta: number): string {
  const [year, month] = key.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * The month a recap should open on: the last one that has finished. On the
 * 1st of September that is August; a recap of a month still in progress would
 * congratulate the vendor on numbers that are about to change.
 */
export function lastCompleteMonth(today: string): string {
  return shiftMonth(today.slice(0, 7), -1);
}
