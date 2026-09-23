"use client";

import { MessageSquarePlus, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { deleteReviewReply, replyToReview } from "@/actions/reviews";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { SortHeader } from "@/components/ui/sort-header";
import { Stars } from "@/components/ui/stars";
import type { Review } from "@/lib/api/types";
import { formatDateTime } from "@/lib/dates";
import { ReplyDialog } from "./reply-dialog";

/**
 * Reviews & Ratings.
 *
 * The rows are held in client state so a reply appears the moment the API
 * confirms it, with no refresh and no refetch of the whole page — the write
 * returns the updated review and it is swapped into the list in place.
 */
export function ReviewsTable({
  reviews: initialReviews,
  startIndex,
  sort,
}: {
  reviews: Review[];
  startIndex: number;
  sort: string;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [replyingTo, setReplyingTo] = useState<Review | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Review | null>(null);
  const [pending, setPending] = useState<"save" | "delete" | null>(null);

  // A new page of results arrives as a new prop; adopt it.
  const [seenReviews, setSeenReviews] = useState(initialReviews);
  if (seenReviews !== initialReviews) {
    setSeenReviews(initialReviews);
    setReviews(initialReviews);
  }

  const replace = (updated: Review) =>
    setReviews((current) =>
      current.map((review) => (review.id === updated.id ? updated : review)),
    );

  const submitReply = async (reply: string) => {
    const review = replyingTo;
    if (!review || pending) return;

    setPending("save");
    const result = await replyToReview(review.id, reply);
    setPending(null);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    if (result.review) replace(result.review);
    toast.success("Reply sent");
    setReplyingTo(null);
  };

  const removeReply = async () => {
    const review = confirmDelete ?? replyingTo;
    if (!review || pending) return;

    setPending("delete");
    const result = await deleteReviewReply(review.id);
    setPending(null);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    // A 204 has no body, so fall back to clearing the reply locally.
    replace(result.review ?? { ...review, vendor_reply: null, replied_at: null });
    toast.success("Reply deleted");
    setConfirmDelete(null);
    setReplyingTo(null);
  };

  if (reviews.length === 0) {
    return (
      <EmptyState
        title="No reviews match these filters"
        description="Try clearing the rating or reply filter, or widening the date range."
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[980px] text-sm">
          <caption className="sr-only">
            Customer reviews matching the current filters
          </caption>
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50/60 text-left text-xs uppercase tracking-wide text-ink-500">
              <th scope="col" className="w-12 px-5 py-2.5 font-medium">
                #
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Customer
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Order Id
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Shop Name
              </th>
              <SortHeader label="Shop Rating" field="rating" currentSort={sort} />
              <th scope="col" className="px-3 py-2.5 font-medium">
                Shop Review
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Vendor Reply
              </th>
              <SortHeader label="Created Date" field="created_at" currentSort={sort} />
              <th scope="col" className="px-5 py-2.5 text-right font-medium">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="stagger">
            {reviews.map((review, index) => (
              <tr
                key={review.id}
                className="border-b border-ink-100 align-top transition-colors last:border-0 hover:bg-ryno-50/40"
              >
                <td className="px-5 py-3 text-ink-400 tabular">{startIndex + index}</td>

                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      name={review.customer.full_name}
                      src={review.customer.avatar_url}
                      size="sm"
                    />
                    <span className="max-w-[150px] truncate font-medium text-ink-900">
                      {review.customer.full_name}
                    </span>
                  </div>
                </td>

                <td className="px-3 py-3">
                  <Link
                    href={`/orders/${review.order_no}`}
                    className="font-medium text-ryno-700 transition-colors hover:text-ryno-600 tabular"
                  >
                    {review.order_no}
                  </Link>
                </td>

                <td className="max-w-[180px] truncate px-3 py-3 text-ink-600">
                  {review.shop.name}
                </td>

                <td className="px-3 py-3">
                  <Stars rating={review.rating} />
                </td>

                <td className="max-w-[260px] px-3 py-3">
                  {review.comment ? (
                    <p className="line-clamp-3 text-ink-700">{review.comment}</p>
                  ) : (
                    <span className="italic text-ink-400">No comment</span>
                  )}
                </td>

                <td className="max-w-[260px] px-3 py-3">
                  {review.vendor_reply ? (
                    // Re-keyed on the reply text so a fresh reply fades in
                    // rather than appearing mid-row without explanation.
                    <div key={review.vendor_reply} className="rise-in">
                      {/* The padding and the clamp must sit on different
                          elements. `-webkit-line-clamp` cuts at the third
                          line, but padding extends the box past that cut, so
                          a fourth line bleeds into the padding before
                          `overflow: hidden` catches it — you get the ellipsis
                          and then more text under it. */}
                      <div className="rounded-lg bg-ryno-50 px-2.5 py-2">
                        <p className="line-clamp-3 text-ryno-900">
                          {review.vendor_reply}
                        </p>
                      </div>
                      {review.replied_at ? (
                        <p className="mt-1 text-xs text-ink-400">
                          {formatDateTime(review.replied_at)}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <span className="italic text-ink-400">Not replied yet</span>
                  )}
                </td>

                <td className="whitespace-nowrap px-3 py-3 text-ink-500">
                  {formatDateTime(review.created_at)}
                </td>

                <td className="px-5 py-3 text-right">
                  <Button
                    size="sm"
                    variant={review.vendor_reply ? "secondary" : "primary"}
                    onClick={() => setReplyingTo(review)}
                    icon={
                      review.vendor_reply ? (
                        <MessageSquareText className="size-3.5" aria-hidden />
                      ) : (
                        <MessageSquarePlus className="size-3.5" aria-hidden />
                      )
                    }
                  >
                    {review.vendor_reply ? "Edit" : "Reply"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ReplyDialog
        review={replyingTo}
        onClose={() => setReplyingTo(null)}
        onSubmit={submitReply}
        onDelete={() => setConfirmDelete(replyingTo)}
        saving={pending === "save"}
        deleting={pending === "delete"}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete this reply?"
        description="The customer will no longer see your response to this review."
        confirmLabel="Delete reply"
        loading={pending === "delete"}
        onConfirm={removeReply}
      />
    </>
  );
}
