"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Stars } from "@/components/ui/stars";
import type { Review } from "@/lib/api/types";
import { formatDateTime } from "@/lib/dates";

export function RecentReviews({ reviews }: { reviews: Review[] }) {
  return (
    <div className="flex min-w-0 flex-col rounded-card border border-ink-200/80 bg-white shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-ink-200/70 px-5 py-4">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">
          Recent Order Reviews
        </h2>
        <Link
          href="/reviews"
          className="inline-flex items-center gap-1 text-sm font-medium text-ryno-700 transition-colors hover:text-ryno-600"
        >
          View all
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          compact
          title="No reviews yet"
          description="Customer ratings for this period will show up here."
        />
      ) : (
        <ul className="stagger stagger-cards divide-y divide-ink-100">
          {reviews.map((review) => (
            <li key={review.id} className="flex gap-3 px-5 py-4">
              <Avatar
                name={review.customer.full_name}
                src={review.customer.avatar_url}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <p className="truncate text-sm font-medium text-ink-900">
                    {review.customer.full_name}
                  </p>
                  <Stars rating={review.rating} />
                </div>

                {review.comment ? (
                  <p className="mt-1 line-clamp-2 text-sm text-ink-600">
                    “{review.comment}”
                  </p>
                ) : (
                  <p className="mt-1 text-sm italic text-ink-400">No comment</p>
                )}

                <p className="mt-1.5 text-xs text-ink-400">
                  <Link
                    href={`/orders/${review.order_no}`}
                    className="font-medium text-ink-500 transition-colors hover:text-ryno-700"
                  >
                    #{review.order_no}
                  </Link>
                  <span aria-hidden> · </span>
                  {formatDateTime(review.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
