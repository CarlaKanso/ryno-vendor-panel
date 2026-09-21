"use client";

import { useEffect } from "react";

import { Card } from "@/components/ui/card";
import { ErrorPanel } from "@/components/ui/error-panel";

export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In a real deployment this is where Sentry (or equivalent) would go.
    console.error(error);
  }, [error]);

  return (
    <Card>
      <ErrorPanel message={error.message} onRetry={reset} />
    </Card>
  );
}
