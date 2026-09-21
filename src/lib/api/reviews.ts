import "server-only";

import { apiFetch, mapWithConcurrency, type QueryValue } from "./http";
import type { Paginated, Review } from "./types";

const MAX_PER_PAGE = 100;

export type ReviewListQuery = {
  page?: number;
  perPage?: number;
  shopId?: string;
  rating?: number;
  hasReply?: boolean;
  q?: string;
  from?: string;
  to?: string;
  sort?: string;
};

function toApiQuery(query: ReviewListQuery): Record<string, QueryValue> {
  return {
    page: query.page,
    per_page: query.perPage,
    shop_id: query.shopId,
    rating: query.rating,
    has_reply: query.hasReply,
    q: query.q,
    from: query.from,
    to: query.to,
    sort: query.sort,
  };
}

export async function getReviews(query: ReviewListQuery): Promise<Paginated<Review>> {
  return apiFetch<Paginated<Review>>("/v1/reviews", { query: toApiQuery(query) });
}

/** Every review matching a query — used by the Excel export. */
export async function getAllReviews(query: ReviewListQuery): Promise<Review[]> {
  const first = await getReviews({ ...query, page: 1, perPage: MAX_PER_PAGE });
  const totalPages = first.meta.total_pages;
  if (totalPages <= 1) return first.data;

  const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
  const pages = await mapWithConcurrency(remaining, 4, (page) =>
    getReviews({ ...query, page, perPage: MAX_PER_PAGE }),
  );

  return [first.data, ...pages.map((page) => page.data)].flat();
}

/** The 5 newest reviews for the dashboard. */
export async function getRecentReviews(query: ReviewListQuery): Promise<Review[]> {
  const response = await getReviews({
    ...query,
    page: 1,
    perPage: 5,
    sort: "-created_at",
  });
  return response.data;
}
