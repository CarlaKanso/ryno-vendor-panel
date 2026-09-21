"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Stars } from "@/components/ui/stars";
import { TextareaInput } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { Review } from "@/lib/api/types";
import { REPLY_MAX_LENGTH } from "@/lib/reviews";

/**
 * Write, edit or delete a reply.
 *
 * The counter is live and the character limit is enforced on the input rather
 * than only on submit, which is the difference between "you can't type more"
 * and "you lost the end of your sentence".
 */
export function ReplyDialog({
  review,
  onClose,
  onSubmit,
  onDelete,
  saving,
  deleting,
}: {
  review: Review | null;
  onClose: () => void;
  onSubmit: (reply: string) => void;
  onDelete: () => void;
  saving: boolean;
  deleting: boolean;
}) {
  const [reply, setReply] = useState("");

  // The dialog stays mounted between openings, so the draft is seeded from
  // whichever review is being replied to, during render.
  const [lastReviewId, setLastReviewId] = useState(review?.id ?? null);
  if (lastReviewId !== (review?.id ?? null)) {
    setLastReviewId(review?.id ?? null);
    setReply(review?.vendor_reply ?? "");
  }

  const remaining = REPLY_MAX_LENGTH - reply.length;
  const busy = saving || deleting;
  const isEdit = Boolean(review?.vendor_reply);

  return (
    <Modal
      open={review !== null}
      onClose={busy ? () => {} : onClose}
      title={isEdit ? "Edit your reply" : "Reply to this review"}
      description="Your reply is shown to the customer next to their review."
      footer={
        <>
          {isEdit ? (
            <Button
              variant="ghost"
              className="mr-auto text-red-600 hover:bg-red-50 hover:text-red-700"
              loading={deleting}
              disabled={saving}
              onClick={onDelete}
            >
              Delete reply
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={saving}
            disabled={deleting || reply.trim().length === 0 || remaining < 0}
            onClick={() => onSubmit(reply)}
          >
            {isEdit ? "Save reply" : "Send reply"}
          </Button>
        </>
      }
    >
      {review ? (
        <div className="mb-4 rounded-lg bg-ink-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-medium text-ink-900">
              {review.customer.full_name}
            </p>
            <Stars rating={review.rating} />
          </div>
          <p className="mt-1.5 text-sm text-ink-600">
            {review.comment ? `“${review.comment}”` : <em>No comment left.</em>}
          </p>
        </div>
      ) : null}

      <label
        htmlFor="vendor-reply"
        className="mb-1.5 block text-xs font-medium text-ink-600"
      >
        Your reply
      </label>
      <TextareaInput
        id="vendor-reply"
        value={reply}
        maxLength={REPLY_MAX_LENGTH}
        placeholder="Thanks for shopping with us…"
        onChange={(event) => setReply(event.target.value)}
      />
      <p
        className={cn(
          "mt-1.5 text-right text-xs tabular",
          remaining < 50 ? "text-red-600" : "text-ink-500",
        )}
        aria-live="polite"
      >
        {remaining} character{remaining === 1 ? "" : "s"} left
      </p>
    </Modal>
  );
}
