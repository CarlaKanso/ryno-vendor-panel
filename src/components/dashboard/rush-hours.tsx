import Link from "next/link";
import type { ReactNode } from "react";

import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { RushCell, RushHours as RushHoursData } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { formatDate, formatHour12, formatHourRange, WEEKDAYS } from "@/lib/dates";
import { formatCount } from "@/lib/money";
import { buildQuery, type SearchParams } from "@/lib/search-params";

/**
 * Rush Hours — a weekday × hour heatmap of when orders arrive.
 *
 * Deliberately a Server Component: it ships no JavaScript at all. The shades
 * are class names, the reveal and the hover are CSS, and every value is
 * already in the markup, so there is nothing for a chart library to hydrate.
 * That also means it prerenders into the static shell with the rest of the
 * analytics block.
 *
 * It is built as a real `<table>` with row headers, column headers and a
 * `<tfoot>` of column totals, rather than a grid of divs. A heatmap is a table
 * of numbers that happens to be coloured, and saying so in the markup is what
 * makes it readable by a screen reader — the colour is never the only encoding.
 */

/** Index is the cell's level, `0` being an hour nobody ordered in. */
const LEVEL_FILL = [
  "bg-ink-100/60",
  "bg-ryno-200 text-ryno-950",
  "bg-ryno-300 text-ryno-950",
  "bg-ryno-400 text-ryno-950",
  "bg-ryno-500 text-white",
  "bg-ryno-700 text-white",
] as const;

const DESCRIPTION =
  "Every Saturday stacked on every other Saturday — the shape of a typical week, not of one week.";

export function RushHours({
  data,
  searchParams,
}: {
  data: RushHoursData;
  searchParams: SearchParams;
}) {
  if (data.total === 0 || data.hours.length === 0) {
    return (
      <Card className="min-w-0">
        <CardHeader
          title="Rush Hours"
          description={DESCRIPTION}
          actions={<ScopeToggle data={data} searchParams={searchParams} />}
        />
        <EmptyState
          compact
          title="No orders to find a pattern in"
          description="Once orders come in, this grid shows which hours of which days are busy."
        />
      </Card>
    );
  }

  const { hours, rows, dayTotals, dayOccurrences, hourTotals, peak, rushes, busiestDay } =
    data;

  // The hours inside a named rush, so the axis can point at what the footer
  // says in words.
  const rushHours = new Set(
    rushes.flatMap((rush) =>
      Array.from({ length: rush.toHour - rush.fromHour + 1 }, (_, i) => rush.fromHour + i),
    ),
  );

  const busiestHour = Math.max(...hourTotals, 1);

  // Where the totals row meets the per-day column: orders on an average day of
  // any kind, which is the line every weekday above should be read against.
  const averageDay = perDay(
    dayTotals.reduce((sum, count) => sum + count, 0),
    dayOccurrences.reduce((sum, count) => sum + count, 0),
  );

  return (
    <Card className="min-w-0">
      <CardHeader
        title="Rush Hours"
        description={DESCRIPTION}
        actions={
          <>
            <ScopeToggle data={data} searchParams={searchParams} />
            <ScaleLegend />
          </>
        }
      />

      <div className="px-3 pb-2 pt-5 sm:px-5">
        <table className="rush-grid w-full table-fixed border-separate border-spacing-0.5">
          <caption className="sr-only">
            Orders by weekday and hour of day, with every occurrence of that weekday
            pooled. Each row is a weekday, each column an hour on the 24-hour clock,
            each cell the number of orders placed in that hour, the last column the
            average for one day of that weekday, and the last row the total for that
            hour across the week.
          </caption>

          <colgroup>
            <col className="w-9 sm:w-11" />
            {hours.map((hour) => (
              <col key={hour} />
            ))}
            <col className="w-11 sm:w-14" />
          </colgroup>

          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Weekday</span>
              </th>
              {hours.map((hour, column) => (
                <th key={hour} scope="col" className="pb-1.5 align-bottom">
                  {/* Every other label hides on a narrow screen rather than the
                      column itself: dropping the `<th>` would leave the body
                      cells without a header to line up under. */}
                  <span
                    aria-hidden
                    className={cn(
                      "rush-hour block text-[10px] leading-none tabular transition-colors",
                      // The two rush windows are named in the footer; darkening
                      // their labels is what ties that sentence to the grid.
                      rushHours.has(hour)
                        ? "font-semibold text-ryno-700"
                        : "font-medium text-ink-400",
                      column % 2 === 1 && "hidden sm:block",
                    )}
                  >
                    {String(hour).padStart(2, "0")}
                  </span>
                  <span className="sr-only">{formatHour12(hour)}</span>
                </th>
              ))}
              <th scope="col" className="pb-1.5 pl-2 align-bottom">
                <span
                  aria-hidden
                  className="block text-[10px] font-medium leading-none text-ink-400"
                >
                  /day
                </span>
                <span className="sr-only">Average orders on one day of that weekday</span>
              </th>
            </tr>
          </thead>

          {/* Hovering a row lifts its label, which is how you find your way back
              to "which day is this" in the middle of nineteen columns. The
              matching column highlight is the `:has()` block in `globals.css`,
              which `.rush-hour` and `.rush-bar` below are the hooks for. */}
          <tbody className="[&_tr:hover_th]:text-ink-900">
            {rows.map((cells, day) => (
              <tr key={day}>
                <th
                  scope="row"
                  className={cn(
                    "pr-1.5 text-right align-middle text-[11px] transition-colors sm:pr-2",
                    // Same emphasis the rush hours wear on the other axis: every
                    // fact in the footer points at something in the grid.
                    day === busiestDay?.day
                      ? "font-semibold text-ryno-700"
                      : "font-medium text-ink-500",
                  )}
                >
                  <span aria-hidden>{WEEKDAYS[day].short}</span>
                  <span className="sr-only">{WEEKDAYS[day].long}</span>
                </th>

                {cells.map((cell, column) => (
                  <Slot
                    key={cell.hour}
                    cell={cell}
                    isPeak={peak?.day === cell.day && peak?.hour === cell.hour}
                    // A short diagonal wipe: the grid fills from Monday morning
                    // towards Sunday night. Capped so the last cell is not still
                    // arriving after a third of a second.
                    delay={Math.min((day + column) * 0.014, 0.34)}
                  />
                ))}

                {/* What "22 orders" is out of. A row pools every Monday in the
                    window, so the total only means something next to the count
                    of Mondays it was spread over. */}
                <td
                  className={cn(
                    "pl-2 text-right align-middle text-[11px] tabular",
                    day === busiestDay?.day
                      ? "font-semibold text-ryno-700"
                      : "font-medium text-ink-600",
                  )}
                >
                  <span aria-hidden>{perDay(dayTotals[day], dayOccurrences[day])}</span>
                  <span className="sr-only">
                    {dayOccurrences[day] === 0
                      ? `No ${WEEKDAYS[day].long}s fall in this window`
                      : `${perDay(dayTotals[day], dayOccurrences[day])} orders on an average ${WEEKDAYS[day].long}, from ${formatCount(dayTotals[day])} over ${formatCount(dayOccurrences[day])} ${WEEKDAYS[day].long}s`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>

          {/* The week collapsed onto one axis. Seven rows of cells show *when*
              in the week; this row is the shape of the day itself, and it is
              where the two rushes stop being a claim and become a silhouette. */}
          <tfoot>
            <tr>
              <th
                scope="row"
                className="pr-1.5 pt-3 text-right align-bottom text-[9px] font-semibold uppercase tracking-wide text-ink-400 sm:pr-2"
              >
                <span aria-hidden>All</span>
                <span className="sr-only">All days combined</span>
              </th>
              {hours.map((hour, column) => (
                <td key={hour} className="pt-3 align-bottom">
                  <div className="flex h-9 items-end sm:h-12">
                    <span
                      aria-hidden
                      className={cn(
                        "rush-bar grow-up w-full rounded-[3px] bg-gradient-to-t transition-[filter]",
                        rushHours.has(hour)
                          ? "from-ryno-600 to-ryno-400"
                          : "from-ryno-300 to-ryno-200",
                      )}
                      style={{
                        // A floor of 6% so an hour with a single order still
                        // draws something rather than vanishing.
                        height: `${Math.max((hourTotals[hour] / busiestHour) * 100, 6)}%`,
                        animationDelay: `${0.18 + column * 0.02}s`,
                      }}
                    />
                  </div>
                  <span className="sr-only">
                    {formatCount(hourTotals[hour])} orders at {formatHour12(hour)} across
                    the week
                  </span>
                </td>
              ))}
              {/* Bottom-right corner: where the totals row meets the per-day
                  column, which makes it orders on an average day of any kind. */}
              <td className="pl-2 pt-3 text-right align-bottom text-[11px] font-semibold text-ink-600 tabular">
                <span aria-hidden>{averageDay}</span>
                <span className="sr-only">
                  {averageDay} orders on an average day, across every weekday
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <Facts data={data} />

    </Card>
  );
}

/**
 * One cell.
 *
 * The count is printed inside the cell from `sm` up, which is what keeps this
 * honest: the colour is a summary, the number is the value, and nobody has to
 * hover a tooltip to read their own data. Below `sm` the cells are too narrow
 * for a figure, so the shape carries the pattern and the facts below carry the
 * specifics — the screen-reader text is there either way.
 */
function Slot({
  cell,
  isPeak,
  delay,
}: {
  cell: RushCell;
  isPeak: boolean;
  delay: number;
}) {
  const quiet = cell.orders === 0;

  return (
    <td
      className={cn(
        "pop-in relative h-6 rounded-[4px] text-center align-middle text-[11px] font-semibold tabular",
        "transition duration-150 ease-out sm:h-8 sm:rounded-[5px]",
        LEVEL_FILL[cell.level],
        // Lifting the hovered cell over its neighbours makes a dense grid feel
        // like something you are reading rather than something you are looking at.
        !quiet && "hover:z-10 hover:scale-[1.14] hover:shadow-card-hover",
        // The gold outline marks the single busiest hour. It is named in words
        // under the grid too, so it never depends on spotting a colour.
        isPeak && "ring-2 ring-inset ring-gold-400",
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      {isPeak ? (
        <span
          aria-hidden
          className="ping-soft pointer-events-none absolute inset-0 rounded-[5px] ring-2 ring-gold-400"
        />
      ) : null}
      <span aria-hidden className="relative hidden sm:inline">
        {quiet ? "" : cell.orders}
      </span>
      <span className="sr-only">
        {quiet ? "no orders" : `${cell.orders} ${cell.orders === 1 ? "order" : "orders"}`}
      </span>
    </td>
  );
}

/**
 * Which orders the grid reads.
 *
 * The sample-size rule is a sensible default, not a verdict: a vendor asking
 * "what did February look like" is asking a fair question, and refusing to
 * answer it is worse than answering it with a warning attached. So the rule
 * only ever picks the *default*, exactly as `suggestGranularity` does for the
 * revenue chart, and this puts the decision back in reach.
 *
 * It is two links rather than a client component, so the card stays a Server
 * Component: the choice is a URL parameter like every other filter, which
 * means it survives a refresh and can be sent to somebody else.
 */
function ScopeToggle({
  data,
  searchParams,
}: {
  data: RushHoursData;
  searchParams: SearchParams;
}) {
  // Nothing to choose between when the range already covers everything.
  if (data.allTimeTotal <= data.rangeTotal) return null;

  const options = [
    { scope: "range", label: "This range", count: data.rangeTotal },
    { scope: "all", label: "All time", count: data.allTimeTotal },
  ] as const;

  return (
    <div
      className="inline-flex rounded-lg bg-ink-100 p-1"
      role="group"
      aria-label="Orders the grid reads"
    >
      {options.map((option) => {
        const active = data.source === option.scope;
        return (
          <Link
            key={option.scope}
            href={`/${buildQuery(searchParams, { rush: option.scope })}`}
            // You are looking at the grid when you press this; jumping back to
            // the top of the page would throw away your place.
            scroll={false}
            aria-current={active ? "true" : undefined}
            className={cn(
              "rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors",
              active
                ? "bg-ryno-600 text-white"
                : "text-ink-600 hover:text-ink-900",
            )}
          >
            {option.label}{" "}
            <span className={cn("tabular", active ? "text-white/70" : "text-ink-400")}>
              {formatCount(option.count)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/**
 * The colour scale.
 *
 * One hue, light to dark, because the cells encode a magnitude — a second hue
 * would invent a category that is not in the data. `aria-hidden` because the
 * table underneath already states every number.
 */
function ScaleLegend() {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      <span className="text-[11px] font-medium text-ink-400">Quieter</span>
      <span className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((level) => (
          <span key={level} className={cn("size-3 rounded-[3px]", LEVEL_FILL[level])} />
        ))}
      </span>
      <span className="text-[11px] font-medium text-ink-400">Busier</span>
    </div>
  );
}

/** The three sentences a manager can act on, and a note on what was read. */
function Facts({ data }: { data: RushHoursData }) {
  const {
    rushes,
    busiestDay,
    dayTotals,
    dayOccurrences,
    peak,
    total,
    rangeTotal,
    span,
    thin,
    widened,
  } = data;

  // "78–79 of each" rather than seven separate numbers: the point is the order
  // of magnitude a cell is out of, not the exact count per row. Weekdays that
  // never occur are counted too — a window of Monday to Thursday holds none of
  // three of these rows, and saying "1 of each" would contradict the three
  // rows showing "—" in the column beside it.
  const fewest = Math.min(...dayOccurrences);
  const most = Math.max(...dayOccurrences);
  const perWeekday = fewest === most ? `${fewest}` : `${fewest}–${most}`;

  return (
    <div className="border-t border-ink-200/70 px-5 py-4">
      <div className="flex flex-wrap gap-y-4">
        {rushes.length > 0 ? (
          <Fact
            label={rushes.length > 1 ? "Two rushes a day" : "Busiest stretch"}
            value={rushes
              .map((rush) => formatHourRange(rush.fromHour, rush.toHour))
              .join("  ·  ")}
            hint={`${rushes.map((rush) => percent(rush.share)).join(" and ")} of all orders`}
          />
        ) : null}

        {busiestDay ? (
          <Fact
            label="Busiest day"
            value={WEEKDAYS[busiestDay.day].long}
            hint={`${perDay(dayTotals[busiestDay.day], dayOccurrences[busiestDay.day])} on an average ${WEEKDAYS[busiestDay.day].long} · ${formatCount(busiestDay.orders)} in total`}
          />
        ) : null}

        {peak ? (
          <Fact
            label="Peak hour"
            marker
            value={`${WEEKDAYS[peak.day].short} ${formatHour12(peak.hour)}`}
            hint={`${formatCount(peak.orders)} orders in that one hour`}
          />
        ) : null}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-ink-400">
        Hour of day on the 24-hour clock, GMT. A cell is the total orders in that
        hour with every occurrence of that weekday pooled — {perWeekday} of each in
        this window — and <span className="tabular">/day</span> is the average for
        one of them.{" "}
        {span ? (
          <>
            Read from {formatCount(total)} orders, {formatDate(span.from)} to{" "}
            {formatDate(span.to)}.
          </>
        ) : null}{" "}
        {widened ? (
          <>
            The selected range held {formatCount(rangeTotal)}, too few to read an
            hourly pattern from, so the grid widened to every order — switch it back
            with <b className="font-semibold text-ink-500">This range</b> above.
            Branch and category filters apply either way.
          </>
        ) : null}
        {thin ? (
          <>
            That is the range you asked for, but {formatCount(total)} orders over{" "}
            {formatCount(dayOccurrences.reduce((sum, count) => sum + count, 0))} days
            is a thin sample for an hourly grid: a single order moves a cell a whole
            shade, so treat the shape as a hint rather than a finding.
          </>
        ) : null}
      </p>
    </div>
  );
}

function Fact({
  label,
  value,
  hint,
  marker = false,
}: {
  label: string;
  value: ReactNode;
  hint: ReactNode;
  marker?: boolean;
}) {
  // The rule between facts only makes sense while they sit side by side;
  // stacked on a phone it reads as a stray indent.
  return (
    <div className="min-w-0 sm:pr-8 sm:[&+&]:border-l sm:[&+&]:border-ink-200/70 sm:[&+&]:pl-8">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-400">
        {marker ? (
          <span
            className="size-3 shrink-0 rounded-[3px] bg-ryno-700 ring-2 ring-inset ring-gold-400"
            aria-hidden
          />
        ) : null}
        {label}
      </p>
      <p className="mt-1 text-[15px] font-semibold text-ink-900">{value}</p>
      <p className="mt-0.5 text-xs text-ink-500 tabular">{hint}</p>
    </div>
  );
}

function percent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/** One decimal, because `3` and `2.2` in the same column should line up. */
function perDay(orders: number, days: number): string {
  return days === 0 ? "—" : (orders / days).toFixed(1);
}
