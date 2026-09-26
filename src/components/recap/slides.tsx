import { Star } from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";

import { CountUp } from "@/components/recap/count-up";
import { cn } from "@/lib/cn";
import { formatHourRange, WEEKDAYS } from "@/lib/dates";
import { formatCount, formatMoney } from "@/lib/money";
import type { Recap } from "@/lib/recap";

/**
 * The slides. Server-rendered markup with two client leaves: `CountUp`, and
 * whatever the deck wraps it in. Everything else is text, images and CSS.
 *
 * `reveal` plus `--i` is the choreography: each element rises in, in order,
 * once its slide is reached. A `SlideFrame` gives every slide the same
 * eyebrow / headline / body rhythm so the deck reads as one voice.
 */

/** Stagger index for the reveal choreography. */
const at = (index: number) => ({ "--i": index }) as CSSProperties;

function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      style={at(0)}
      className={cn(
        "reveal text-[13px] font-semibold uppercase tracking-[0.2em] opacity-70",
        className,
      )}
    >
      {children}
    </p>
  );
}

function Headline({
  children,
  index = 1,
  className,
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
}) {
  return (
    <h2
      style={at(index)}
      className={cn(
        "reveal mt-3 font-display text-[clamp(3.5rem,12vw,9rem)] leading-[0.9] tracking-wide",
        className,
      )}
    >
      {children}
    </h2>
  );
}

function Body({
  children,
  index = 2,
  className,
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
}) {
  return (
    <p
      style={at(index)}
      className={cn(
        "reveal mt-5 max-w-xl text-lg leading-relaxed opacity-90 sm:text-xl",
        className,
      )}
    >
      {children}
    </p>
  );
}

function formatChange(fraction: number): string {
  const percent = Math.round(Math.abs(fraction) * 100);
  return `${fraction >= 0 ? "+" : "−"}${percent}%`;
}

/** `9.5` → `"every 9½ hours"`; `30` → `"every 1.3 days"`; `0.4` → `"every 24 minutes"`. */
function formatEvery(hours: number): string {
  if (hours < 1) return `every ${Math.max(1, Math.round(hours * 60))} minutes`;
  if (hours < 24) {
    const whole = Math.floor(hours);
    const fraction = hours - whole;
    const half = fraction >= 0.25 && fraction < 0.75 ? "½" : "";
    const rounded = fraction >= 0.75 ? whole + 1 : whole;
    return `every ${rounded}${half} ${rounded === 1 && !half ? "hour" : "hours"}`;
  }
  return `every ${(hours / 24).toFixed(1)} days`;
}

/* -------------------------------------------------------------------------- */

export function CoverSlide({ recap }: { recap: Recap }) {
  return (
    <div className="text-center">
      <div style={at(0)} className="reveal mx-auto mb-8 w-fit">
        <Image
          src="/brand/ryno-mascot.png"
          alt=""
          width={132}
          height={132}
          priority
          className="float-y drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)]"
        />
      </div>
      <Eyebrow className="text-gold-300">{recap.vendorName}</Eyebrow>
      <Headline className="text-white">{recap.label}</Headline>
      <Body index={2} className="mx-auto text-white/80">
        Your month, in a few slides.
      </Body>
      <p style={at(3)} className="reveal mt-8 text-sm text-white/50 tabular">
        {formatCount(recap.kpis.totalOrders)} orders ·{" "}
        {formatMoney(recap.kpis.totalSales, recap.currency)} in sales
      </p>
    </div>
  );
}

export function VolumeSlide({ recap }: { recap: Recap }) {
  const { kpis, change, hoursPerOrder, previousLabel } = recap;

  return (
    <div>
      <Eyebrow>You handled</Eyebrow>
      <Headline>
        <CountUp value={kpis.totalOrders} />
        <span className="ml-4 text-[0.35em] tracking-normal opacity-80">orders</span>
      </Headline>
      <Body>
        {hoursPerOrder !== null ? <>That is one {formatEvery(hoursPerOrder)}</> : null}
        {hoursPerOrder !== null && change !== null ? " — and " : null}
        {change !== null ? (
          <>
            <strong className="font-semibold">{formatChange(change)}</strong> against{" "}
            {previousLabel}.
          </>
        ) : hoursPerOrder !== null ? (
          "."
        ) : null}
      </Body>
      <dl style={at(3)} className="reveal mt-10 flex flex-wrap gap-x-10 gap-y-4">
        <div>
          <dt className="text-[12px] font-semibold uppercase tracking-wider opacity-60">
            Delivered
          </dt>
          <dd className="mt-1 text-3xl font-semibold tabular">{formatCount(kpis.delivered)}</dd>
        </div>
        <div>
          <dt className="text-[12px] font-semibold uppercase tracking-wider opacity-60">
            Cancelled
          </dt>
          <dd className="mt-1 text-3xl font-semibold tabular">{formatCount(kpis.cancelled)}</dd>
        </div>
        <div>
          <dt className="text-[12px] font-semibold uppercase tracking-wider opacity-60">
            Your earnings
          </dt>
          <dd className="mt-1 text-3xl font-semibold tabular">
            <CountUp value={kpis.revenue} kind="money" currency={recap.currency} />
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function RushSlide({ recap }: { recap: Recap }) {
  const { rush } = recap;
  const busiestHour = Math.max(...rush.hourTotals, 1);
  const window = rush.rushes[0];

  return (
    <div>
      <Eyebrow className="text-gold-300">Your busiest day was</Eyebrow>
      <Headline className="text-white">
        {rush.busiestDay ? WEEKDAYS[rush.busiestDay.day].long : "—"}
      </Headline>
      {window ? (
        <Body className="text-white/85">
          and the rush ran{" "}
          <strong className="font-semibold text-gold-300">
            {formatHourRange(window.fromHour, window.toHour)}
          </strong>
          {rush.rushes[1] ? (
            <>
              , with a second wave at{" "}
              <strong className="font-semibold text-gold-300">
                {formatHourRange(rush.rushes[1].fromHour, rush.rushes[1].toHour)}
              </strong>
            </>
          ) : null}
          .
        </Body>
      ) : null}

      {/* The month's day-shape: every hour's total, standing up from the
          baseline in order. The two rushes read as two hills. */}
      <div style={at(3)} className="reveal mt-10">
        <div className="flex h-28 items-stretch gap-[3px] sm:h-36">
          {rush.hours.map((hour, index) => (
            <div key={hour} className="flex min-w-0 flex-1 flex-col justify-end">
              <span
                aria-hidden
                className="grow-up w-full rounded-t-[3px] bg-gradient-to-t from-gold-500 to-gold-300"
                style={{
                  height: `${Math.max((rush.hourTotals[hour] / busiestHour) * 100, 4)}%`,
                  animationDelay: `${0.45 + index * 0.035}s`,
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex gap-[3px] text-[10px] text-white/50 tabular">
          {rush.hours.map((hour, index) => (
            <span
              key={hour}
              className={cn("min-w-0 flex-1 text-center", index % 3 !== 0 && "invisible sm:visible")}
            >
              {String(hour).padStart(2, "0")}
            </span>
          ))}
        </div>
        <p className="sr-only">
          Orders by hour of the day across the month:{" "}
          {rush.hours.map((hour) => `${hour}:00, ${rush.hourTotals[hour]}`).join("; ")}.
        </p>
      </div>
    </div>
  );
}

export function BestSellerSlide({ recap }: { recap: Recap }) {
  const [lead, ...rest] = recap.items;
  const top = Math.max(lead.quantity, 1);

  return (
    <div className="grid items-center gap-8 sm:grid-cols-[auto_1fr] sm:gap-12">
      <div style={at(1)} className="reveal mx-auto sm:mx-0">
        <div className="pop-in grid size-44 place-items-center overflow-hidden rounded-3xl bg-white shadow-pop ring-1 ring-ink-200 sm:size-56">
          {lead.imageUrl ? (
            <Image
              src={lead.imageUrl}
              alt=""
              width={224}
              height={224}
              className="size-full object-cover"
              unoptimized
            />
          ) : (
            <span className="font-display text-6xl text-ink-300">#1</span>
          )}
        </div>
      </div>

      <div>
        <Eyebrow className="text-ryno-700">Your best seller</Eyebrow>
        <Headline className="text-[clamp(2.5rem,7vw,5.5rem)] text-ink-900">{lead.name}</Headline>
        <Body>
          <strong className="font-semibold">{formatCount(lead.quantity)} sold</strong> ·{" "}
          {formatMoney(lead.revenue, recap.currency)}
        </Body>

        {rest.length > 0 ? (
          <ol style={at(3)} className="reveal mt-8 space-y-3">
            {rest.map((item, index) => (
              <li key={item.itemId}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium text-ink-800">
                    <span className="mr-2 text-ink-400 tabular">{index + 2}</span>
                    {item.name}
                  </span>
                  <span className="shrink-0 text-ink-600 tabular">
                    {formatCount(item.quantity)} sold
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-200">
                  <div
                    className="grow-x h-full rounded-full bg-gradient-to-r from-ryno-500 to-gold-400"
                    style={{
                      width: `${Math.max((item.quantity / top) * 100, 3)}%`,
                      animationDelay: `${0.5 + index * 0.12}s`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </div>
  );
}

export function BranchSlide({ recap }: { recap: Recap }) {
  const [lead, ...rest] = recap.shops;
  const top = Math.max(lead.totalSales, 1);
  // "Kaya Market – East Legon" → "East Legon": the vendor knows its own name.
  const shortName = (name: string) => name.split(/\s[–-]\s/).at(-1) ?? name;

  return (
    <div>
      <Eyebrow className="text-gold-300">Your star branch</Eyebrow>
      <Headline className="text-white">{shortName(lead.name)}</Headline>
      <Body className="text-white/85">
        {recap.leadShare !== null ? (
          <>
            <strong className="font-semibold text-gold-300">
              {Math.round(recap.leadShare * 100)}%
            </strong>{" "}
            of your sales ·{" "}
          </>
        ) : null}
        {formatMoney(lead.totalSales, recap.currency)} from {formatCount(lead.orders)} orders
      </Body>

      <ol style={at(3)} className="reveal mt-10 space-y-3">
        {[lead, ...rest].map((shop, index) => (
          <li key={shop.shopId} className="flex items-center gap-4">
            <span className="w-28 shrink-0 truncate text-sm text-white/80 sm:w-36">
              {shortName(shop.name)}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className={cn(
                  "grow-x h-full rounded-full",
                  index === 0
                    ? "bg-gradient-to-r from-gold-500 to-gold-300"
                    : "bg-white/40",
                )}
                style={{
                  width: `${Math.max((shop.totalSales / top) * 100, 2)}%`,
                  animationDelay: `${0.5 + index * 0.1}s`,
                }}
              />
            </div>
            <span className="w-24 shrink-0 text-right text-sm text-white/70 tabular">
              {formatMoney(shop.totalSales, recap.currency).replace(/^[A-Z]{3}\s/, "")}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function CustomersSlide({ recap }: { recap: Recap }) {
  const { average, count, best } = recap.reviews;
  const filled = average === null ? 0 : Math.round(average);

  return (
    <div>
      <Eyebrow>Customers rated you</Eyebrow>
      <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
        <h2 style={at(1)} className="reveal font-display text-[clamp(4rem,14vw,10rem)] leading-[0.9]">
          {average === null ? "—" : average.toFixed(1)}
        </h2>
        <div
          className="mb-3 flex gap-1"
          role="img"
          aria-label={average === null ? "No ratings" : `Rated ${average} out of 5`}
        >
          {Array.from({ length: 5 }, (_, index) => (
            <span key={index} style={at(2 + index)} className="reveal">
              <Star
                aria-hidden
                className={cn(
                  "size-8 sm:size-10",
                  index < filled
                    ? "fill-ryno-900 text-ryno-900"
                    : "fill-ryno-900/15 text-ryno-900/15",
                )}
              />
            </span>
          ))}
        </div>
      </div>
      <Body index={7}>
        across <strong className="font-semibold">{formatCount(count)}</strong>{" "}
        {count === 1 ? "review" : "reviews"}.
      </Body>

      {best?.comment ? (
        <figure style={at(8)} className="reveal mt-10 border-l-4 border-ryno-900/30 pl-5">
          {/* Clamped: a five-paragraph review is still the best review, but
              the slide is a headline, not the reviews page. */}
          <blockquote className="line-clamp-5 text-2xl font-medium leading-snug sm:text-3xl">
            “{best.comment.trim()}”
          </blockquote>
          <figcaption className="mt-3 text-sm opacity-70">
            — {best.customer.full_name.split(" ")[0]}, {best.rating}{" "}
            {best.rating === 1 ? "star" : "stars"}
          </figcaption>
        </figure>
      ) : null}
    </div>
  );
}

export function FixSlide({ recap }: { recap: Recap }) {
  const { drops } = recap;

  if (drops.lines === 0) {
    return (
      <div>
        <Eyebrow className="text-ryno-700">Stock</Eyebrow>
        <Headline className="text-ink-900">Nothing ran out.</Headline>
        <Body>
          Not one line was marked unavailable on a completed order. Every basket left
          the way it was filled.
        </Body>
      </div>
    );
  }

  return (
    <div>
      <Eyebrow className="text-ryno-700">One thing to fix</Eyebrow>
      <Headline className="text-ink-900">
        <CountUp value={drops.lines} />
        <span className="ml-4 text-[0.35em] tracking-normal text-ink-500">
          {drops.lines === 1 ? "item" : "items"} ran out
        </span>
      </Headline>
      <Body>
        Across {formatCount(drops.orders)} completed{" "}
        {drops.orders === 1 ? "order" : "orders"}, that is{" "}
        <strong className="font-semibold">{formatMoney(drops.value, recap.currency)}</strong>{" "}
        that was in a basket and never sold.
      </Body>

      <ol style={at(3)} className="reveal mt-8 flex flex-wrap gap-3">
        {drops.worst.map((item) => (
          <li
            key={item.itemId}
            className="flex items-center gap-3 rounded-2xl bg-white py-2 pl-2 pr-4 shadow-card ring-1 ring-ink-200"
          >
            <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-ink-100">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt=""
                  width={44}
                  height={44}
                  className="size-full object-cover"
                  unoptimized
                />
              ) : null}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-ink-800">{item.name}</span>
              <span className="block text-xs text-ink-500 tabular">
                dropped {formatCount(item.lines)} {item.lines === 1 ? "time" : "times"}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function SignOffSlide({
  recap,
  previousHref,
  nextHref,
  nextLabel,
}: {
  recap: Recap;
  previousHref: string;
  nextHref: string | null;
  nextLabel: string | null;
}) {
  return (
    <div className="text-center">
      <div style={at(0)} className="reveal mx-auto mb-8 w-fit">
        <Image
          src="/brand/ryno-mascot.png"
          alt=""
          width={110}
          height={110}
          className="float-y drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)]"
        />
      </div>
      <Eyebrow className="text-gold-300">That was {recap.label}</Eyebrow>
      <Headline className="text-white">
        {nextLabel ? `On to ${nextLabel.split(" ")[0]}.` : "See you next month."}
      </Headline>
      {/* Plain anchors, all three: every one of these leaves this exact
          deck instance and lands on another (or the same URL again, for a
          month switch), and a soft client-side navigation is precisely what
          lets Next's router resume a previously rendered instance rather
          than starting fresh — every slide already sitting marked "seen"
          from the visit you are leaving. A real navigation has nothing to
          resume. See the matching note on the dashboard's own recap link. */}
      <div style={at(2)} className="reveal mt-10 flex flex-wrap items-center justify-center gap-3">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="inline-flex h-11 items-center rounded-lg bg-gold-400 px-5 text-sm font-semibold text-ryno-900 shadow-sm transition-colors hover:bg-gold-300"
        >
          Back to the dashboard
        </a>
        <a
          href={previousHref}
          className="inline-flex h-11 items-center rounded-lg bg-white/10 px-5 text-sm font-medium text-white transition-colors hover:bg-white/20"
        >
          ← {recap.previousLabel}
        </a>
        {nextHref && nextLabel ? (
          <a
            href={nextHref}
            className="inline-flex h-11 items-center rounded-lg bg-white/10 px-5 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            {nextLabel} →
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyMonthSlide({ recap }: { recap: Recap }) {
  return (
    <div className="text-center">
      <div style={at(0)} className="reveal mx-auto mb-8 w-fit">
        <Image
          src="/brand/ryno-mascot.png"
          alt=""
          width={132}
          height={132}
          priority
          className="float-y opacity-80 grayscale drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)]"
        />
      </div>
      <Eyebrow className="text-gold-300">{recap.vendorName}</Eyebrow>
      <Headline className="text-white">{recap.label}</Headline>
      <Body index={2} className="mx-auto text-white/80">
        Not a single order this month, so there is no story to tell. Try the month
        before.
      </Body>
    </div>
  );
}
