import { Suspense } from "react";

import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { RecentReviews } from "@/components/dashboard/recent-reviews";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { TopSelling } from "@/components/dashboard/top-selling";
import { PageHeader } from "@/components/shell/page-header";
import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";
import {
  buildRevenueSeries,
  computeKpis,
  filterOrders,
  suggestGranularity,
  topItems,
  topShops,
  type DashboardFilters as Filters,
} from "@/lib/analytics";
import { getDashboardSnapshot, getRecentOrders } from "@/lib/api/orders";
import { getRecentReviews } from "@/lib/api/reviews";
import { getCategoryTree, getShops, getVendor } from "@/lib/api/vendor";
import type { Granularity } from "@/lib/dates";
import {
  readDateRange,
  readGranularity,
  readString,
  type SearchParams,
} from "@/lib/search-params";

export const metadata = { title: "Dashboard" };

type SearchParamsPromise = Promise<SearchParams>;

/**
 * The dashboard.
 *
 * Note what the page component does *not* do: it never awaits `searchParams`.
 * Reading a runtime value in the page body would make the whole route wait for
 * the request before anything could be prerendered. Instead the promise is
 * handed to each section, every section sits behind its own `<Suspense>`, and
 * the shell — heading, card frames, skeletons — is part of the static output.
 * Each section then fills in as its own data resolves; nothing waits on the
 * slowest query.
 */
export default function DashboardPage({ searchParams }: PageProps<"/">) {
  const params = searchParams as SearchParamsPromise;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Sales, orders and customer feedback across every Kaya Market branch."
      />

      <div className="space-y-4">
        <Suspense fallback={<Skeleton className="h-[218px] w-full rounded-card" />}>
          <FilterBar searchParams={params} />
        </Suspense>

        <Suspense fallback={<AnalyticsSkeleton />}>
          <Analytics searchParams={params} />
        </Suspense>

        {/* `items-start` so each card ends where its own content ends. Both
            lists hold five rows, but a review is three lines and an order is
            one — stretching them to match left ~170px of empty white under
            the orders, which reads as something failing to load. The chart
            row above keeps the default stretch, because a fixed-height chart
            beside a five-item list is naturally the same height. */}
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Suspense fallback={<Skeleton className="h-[420px] w-full rounded-card" />}>
            <RecentOrdersSection searchParams={params} />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-[420px] w-full rounded-card" />}>
            <RecentReviewsSection searchParams={params} />
          </Suspense>
        </div>
      </div>
    </>
  );
}

/**
 * Turns the URL into the shape the analytics functions want.
 *
 * `today` is read here rather than passed in from the page, because the page
 * no longer renders at request time — it is prerendered, and a date captured
 * during a build would be wrong by the time anyone looked at it.
 */
async function resolveFilters(searchParams: SearchParamsPromise): Promise<{
  filters: Filters;
  range: { from: string; to: string };
  granularity: Granularity;
}> {
  const params = await searchParams;
  const range = readDateRange(params, new Date());

  return {
    range,
    granularity: readGranularity(params, suggestGranularity(range)),
    filters: {
      shopId: readString(params, "shop_id"),
      mainCategoryId: readString(params, "main_category_id"),
      categoryId: readString(params, "category_id"),
      subCategoryId: readString(params, "sub_category_id"),
      from: range.from,
      to: range.to,
    },
  };
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Skeleton className="h-[380px] rounded-card" />
        <Skeleton className="h-[380px] rounded-card" />
      </div>
    </div>
  );
}

async function FilterBar({ searchParams }: { searchParams: SearchParamsPromise }) {
  const [{ range }, shops, categories] = await Promise.all([
    resolveFilters(searchParams),
    getShops(),
    getCategoryTree(),
  ]);

  return <DashboardFilters shops={shops} categories={categories} defaultRange={range} />;
}

/**
 * KPIs, chart and Top Selling all come from one snapshot.
 *
 * `getDashboardSnapshot()` is the cached read of every non-archived order;
 * everything below it is pure computation over that array, so five filtered
 * views cost one fetch rather than five.
 */
async function Analytics({ searchParams }: { searchParams: SearchParamsPromise }) {
  const [{ filters, range, granularity }, snapshot, vendor] = await Promise.all([
    resolveFilters(searchParams),
    getDashboardSnapshot(),
    getVendor(),
  ]);

  const orders = filterOrders(snapshot, filters);

  return (
    <div className="space-y-4">
      <KpiCards kpis={computeKpis(orders)} currency={vendor.currency} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <RevenueChart
          points={buildRevenueSeries(orders, range, granularity)}
          granularity={granularity}
          currency={vendor.currency}
        />
        <TopSelling
          shops={topShops(orders)}
          items={topItems(orders)}
          currency={vendor.currency}
        />
      </div>
    </div>
  );
}

async function RecentOrdersSection({
  searchParams,
}: {
  searchParams: SearchParamsPromise;
}) {
  const { filters } = await resolveFilters(searchParams);
  const orders = await getRecentOrders({
    shopId: filters.shopId,
    mainCategoryId: filters.mainCategoryId,
    categoryId: filters.categoryId,
    subCategoryId: filters.subCategoryId,
    from: filters.from,
    to: filters.to,
  });
  return <RecentOrders orders={orders} />;
}

async function RecentReviewsSection({
  searchParams,
}: {
  searchParams: SearchParamsPromise;
}) {
  const { filters } = await resolveFilters(searchParams);
  // Reviews have no category dimension, so only shop and date apply here.
  const reviews = await getRecentReviews({
    shopId: filters.shopId,
    from: filters.from,
    to: filters.to,
  });
  return <RecentReviews reviews={reviews} />;
}
