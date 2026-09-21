"use server";

import { updateTag } from "next/cache";

import { ApiError, apiFetch } from "@/lib/api/http";
import { CACHE_TAGS } from "@/lib/api/tags";
import type { Envelope, Review } from "@/lib/api/types";
import { REPLY_MAX_LENGTH } from "@/lib/reviews";

/**
 * Review replies.
 *
 * The API caps a reply at 1,000 characters; that limit is enforced here too,
 * so an over-long reply fails instantly with a clear message instead of
 * spending a round trip to be told the same thing.
 */

export type ReviewResult =
  | { ok: true; review: Review | null }
  | { ok: false; message: string; code: string; conflict: boolean };

function failure(error: unknown): Extract<ReviewResult, { ok: false }> {
  if (error instanceof ApiError) {
    return {
      ok: false,
      message: error.message,
      code: error.code,
      conflict: error.isConflict,
    };
  }
  return {
    ok: false,
    message: "Something went wrong. Please try again.",
    code: "unknown_error",
    conflict: false,
  };
}

export async function replyToReview(
  reviewId: string,
  reply: string,
): Promise<ReviewResult> {
  const trimmed = reply.trim();

  if (trimmed.length === 0) {
    return {
      ok: false,
      message: "Write something before you send the reply.",
      code: "validation_error",
      conflict: false,
    };
  }

  if (trimmed.length > REPLY_MAX_LENGTH) {
    return {
      ok: false,
      message: `Replies are limited to ${REPLY_MAX_LENGTH} characters.`,
      code: "validation_error",
      conflict: false,
    };
  }

  try {
    const response = await apiFetch<Envelope<Review>>(
      `/v1/reviews/${encodeURIComponent(reviewId)}/reply`,
      { method: "PUT", body: { reply: trimmed } },
    );
    updateTag(CACHE_TAGS.reviews);
    return { ok: true, review: response.data };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteReviewReply(reviewId: string): Promise<ReviewResult> {
  try {
    const response = await apiFetch<Envelope<Review> | undefined>(
      `/v1/reviews/${encodeURIComponent(reviewId)}/reply`,
      { method: "DELETE" },
    );
    updateTag(CACHE_TAGS.reviews);
    // A 204 comes back empty, so the caller clears the reply itself.
    return { ok: true, review: response?.data ?? null };
  } catch (error) {
    return failure(error);
  }
}
