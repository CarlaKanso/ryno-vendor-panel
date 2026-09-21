import { Suspense } from "react";

import { ReviewsFilters } from "@/components/reviews/reviews-filters";
import { ReviewsTable } from "@/components/reviews/reviews-table";
import { PageHeader } from "@/components/shell/page-header";
import { ExportButton } from "@/components/ui/export-button";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";
import { getReviews } from "@/lib/api/reviews";
import { getShops } from "@/lib/api/vendor";
import {
  readDateKey,
  readEnum,
  readInt,
  readPerPage,
  readString,
  REVIEW_SORTS,
  type SearchParams,
} from "@/lib/search-params";

export const metadata = { title: "Reviews" };

type SearchParamsPromise = Promise<SearchParams>;

export default function ReviewsPage({ searchParams }: PageProps<"/reviews">) {
  const params = searchParams as SearchParamsPromise;

  return (
    <>
      <PageHeader
        title="Reviews & Ratings"
        description="What customers said, and what you said back."
        actions={
          <Suspense fallback={<Skeleton className="h-10 w-40" />}>
            <ExportButton endpoint="/api/export/reviews" />
          </Suspense>
        }
      />

      <div className="space-y-4">
        <Suspense fallback={<Skeleton className="h-[250px] w-full rounded-card" />}>
          <Filters />
        </Suspense>

        <div className="overflow-hidden rounded-card border border-ink-200/80 bg-white shadow-card">
          <Suspense fallback={<TableSkeleton rows={10} columns={7} />}>
            <ReviewResults searchParams={params} />
          </Suspense>
        </div>
      </div>
    </>
  );
}

async function Filters() {
  const shops = await getShops();
  return <ReviewsFilters shops={shops} />;
}

async function ReviewResults({ searchParams }: { searchParams: SearchParamsPromise }) {
  const params = await searchParams;

  const sort = readEnum(params, "sort", REVIEW_SORTS, "-created_at");
  const ratingParam = readString(params, "rating");
  const hasReplyParam = readString(params, "has_reply");

  const result = await getReviews({
    page: readInt(params, "page", 1),
    perPage: readPerPage(params),
    sort,
    shopId: readString(params, "shop_id"),
    rating: ratingParam ? readInt(params, "rating", 0, { min: 1, max: 5 }) : undefined,
    hasReply:
      hasReplyParam === "true" ? true : hasReplyParam === "false" ? false : undefined,
    q: readString(params, "q"),
    from: readDateKey(params, "from"),
    to: readDateKey(params, "to"),
  });

  return (
    <>
      <ReviewsTable
        reviews={result.data}
        startIndex={(result.meta.page - 1) * result.meta.per_page + 1}
        sort={sort}
      />
      <Pagination
        page={result.meta.page}
        perPage={result.meta.per_page}
        total={result.meta.total}
        totalPages={result.meta.total_pages}
        itemLabel="reviews"
      />
    </>
  );
}
