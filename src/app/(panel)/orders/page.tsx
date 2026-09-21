import { Suspense } from "react";

import { OrdersFilters } from "@/components/orders/orders-filters";
import { OrdersTable } from "@/components/orders/orders-table";
import { PageHeader } from "@/components/shell/page-header";
import { ExportButton } from "@/components/ui/export-button";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";
import { getOrders } from "@/lib/api/orders";
import { getShops, getVendor } from "@/lib/api/vendor";
import {
  ARCHIVED_MODES,
  ORDER_SORTS,
  readDateKey,
  readEnum,
  readInt,
  readPerPage,
  readString,
  readStatuses,
  type SearchParams,
} from "@/lib/search-params";

export const metadata = { title: "Orders" };

type SearchParamsPromise = Promise<SearchParams>;

/**
 * Order List.
 *
 * Unlike the dashboard, this page does *not* load everything: filtering,
 * sorting and paging are all pushed to the API, so one page view is one
 * request for at most 100 rows however big the vendor gets.
 *
 * As on the dashboard, `searchParams` is awaited inside the Suspense
 * boundaries rather than in the page body, so the chrome prerenders and only
 * the table waits on the request.
 */
export default function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const params = searchParams as SearchParamsPromise;

  return (
    <>
      <PageHeader
        title="Orders"
        description="Every order across your branches. Filters, sort and page all live in the URL."
        actions={
          <Suspense fallback={<Skeleton className="h-10 w-40" />}>
            <ExportButton endpoint="/api/export/orders" />
          </Suspense>
        }
      />

      <div className="space-y-4">
        <Suspense fallback={<Skeleton className="h-[280px] w-full rounded-card" />}>
          <Filters searchParams={params} />
        </Suspense>

        <div className="overflow-hidden rounded-card border border-ink-200/80 bg-white shadow-card">
          <Suspense fallback={<TableSkeleton rows={10} columns={8} />}>
            <OrdersResults searchParams={params} />
          </Suspense>
        </div>
      </div>
    </>
  );
}

async function Filters({ searchParams }: { searchParams: SearchParamsPromise }) {
  const [params, shops] = await Promise.all([searchParams, getShops()]);
  const archived = readEnum(params, "archived", ARCHIVED_MODES, "exclude");
  return <OrdersFilters shops={shops} archivedOnly={archived === "only"} />;
}

async function OrdersResults({ searchParams }: { searchParams: SearchParamsPromise }) {
  const params = await searchParams;

  const sort = readEnum(params, "sort", ORDER_SORTS, "-created_at");
  const archived = readEnum(params, "archived", ARCHIVED_MODES, "exclude");

  const [result, vendor] = await Promise.all([
    getOrders({
      page: readInt(params, "page", 1),
      perPage: readPerPage(params),
      sort,
      archived,
      shopId: readString(params, "shop_id"),
      status: readStatuses(params),
      from: readDateKey(params, "from"),
      to: readDateKey(params, "to"),
      mainCategoryId: readString(params, "main_category_id"),
      categoryId: readString(params, "category_id"),
      subCategoryId: readString(params, "sub_category_id"),
      q: readString(params, "q"),
    }),
    getVendor(),
  ]);

  return (
    <>
      <OrdersTable
        orders={result.data}
        vendorName={vendor.name}
        startIndex={(result.meta.page - 1) * result.meta.per_page + 1}
        sort={sort}
        archivedOnly={archived === "only"}
      />
      <Pagination
        page={result.meta.page}
        perPage={result.meta.per_page}
        total={result.meta.total}
        totalPages={result.meta.total_pages}
      />
    </>
  );
}
