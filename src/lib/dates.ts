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

/** "2 hours ago" style, for review and order lists. */
export function formatRelative(iso: string | null | undefined, now: Date): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["second", 60],
    ["minute", 60],
    ["hour", 24],
    ["day", 7],
    ["week", 4.35],
    ["month", 12],
    ["year", Number.POSITIVE_INFINITY],
  ];

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  let value = seconds;
  for (const [unit, size] of units) {
    if (Math.abs(value) < size) return formatter.format(-Math.round(value), unit);
    value /= size;
  }
  return formatter.format(-Math.round(value), "year");
}
