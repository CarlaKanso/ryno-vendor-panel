"use client";

import { motion } from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import type { RevenuePoint } from "@/lib/analytics";
import type { Granularity } from "@/lib/dates";
import { formatCompactAmount, formatCount, formatMoney } from "@/lib/money";
import { buildQuery, GRANULARITIES } from "@/lib/search-params";

const GRANULARITY_LABELS: Record<Granularity, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export function RevenueChart({
  points,
  granularity,
  currency = "GHS",
}: {
  points: RevenuePoint[];
  granularity: Granularity;
  currency?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const setGranularity = (next: Granularity) => {
    startTransition(() =>
      router.push(`${pathname}${buildQuery(searchParams, { granularity: next })}`),
    );
  };

  const hasRevenue = points.some((point) => point.revenue > 0);

  return (
    <div className="rounded-card border border-ink-200/80 bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200/70 px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">
            Revenue Analytics
          </h2>
          <p className="mt-0.5 text-sm text-ink-500">
            Your earnings on completed orders
          </p>
        </div>

        {/* Segmented control. The sliding pill is a shared `layoutId`, so the
            highlight travels between options instead of blinking. */}
        <div
          className="inline-flex rounded-lg bg-ink-100 p-1"
          role="group"
          aria-label="Chart granularity"
        >
          {GRANULARITIES.map((option) => {
            const active = option === granularity;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setGranularity(option)}
                aria-pressed={active}
                disabled={pending}
                className={cn(
                  "relative rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                  active ? "text-white" : "text-ink-600 hover:text-ink-900",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="granularity-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-md bg-ryno-600"
                    aria-hidden
                  />
                ) : null}
                <span className="relative">{GRANULARITY_LABELS[option]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-2 py-4 sm:px-4">
        {points.length === 0 || !hasRevenue ? (
          <EmptyState
            compact
            title="No sales in this period"
            description="Nothing was completed in the selected range. Try a wider date range or another branch."
          />
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={points}
                margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
              >
                <defs>
                  <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#395f2d" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#395f2d" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#dfe2e1"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#737a78", fontSize: 12 }}
                  minTickGap={24}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tick={{ fill: "#737a78", fontSize: 12 }}
                  tickFormatter={formatCompactAmount}
                />
                <Tooltip
                  cursor={{ stroke: "#9aa09e", strokeDasharray: "4 4" }}
                  content={<ChartTooltip currency={currency} />}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#395f2d"
                  strokeWidth={2}
                  fill="url(#revenue-fill)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#395f2d", stroke: "#fff", strokeWidth: 2 }}
                  // Recharts draws the area in; 700ms is long enough to read
                  // as a reveal and short enough not to delay the numbers.
                  animationDuration={700}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ payload: RevenuePoint }>;
  label?: string;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-lg border border-ink-200 bg-white px-3 py-2 shadow-card-hover">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink-900 tabular">
        {formatMoney(point.revenue, currency)}
      </p>
      <p className="mt-0.5 text-xs text-ink-500 tabular">
        {formatMoney(point.sales, currency)} sales · {formatCount(point.orders)}{" "}
        {point.orders === 1 ? "order" : "orders"}
      </p>
    </div>
  );
}
