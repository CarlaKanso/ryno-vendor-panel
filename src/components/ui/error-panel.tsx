"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "./button";
import { EmptyState } from "./empty-state";

/**
 * The error state every page falls back to.
 *
 * It shows the API's own `error.message` when there is one — those messages
 * are written to be read by a vendor — and a retry that re-runs the failed
 * render rather than a full page reload.
 */
export function ErrorPanel({
  title = "Something went wrong",
  message,
  onRetry,
  compact,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <EmptyState
      tone="error"
      compact={compact}
      title={title}
      description={message ?? "We couldn't load this from the vendor API."}
      action={
        onRetry ? (
          <Button
            variant="secondary"
            onClick={onRetry}
            icon={<RefreshCw className="size-4" aria-hidden />}
          >
            Try again
          </Button>
        ) : null
      }
    />
  );
}
