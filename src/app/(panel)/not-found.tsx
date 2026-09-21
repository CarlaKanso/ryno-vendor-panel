import Link from "next/link";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <Card>
      <EmptyState
        title="We couldn't find that page"
        description="The link may be out of date, or the record has been removed."
        action={
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-lg bg-ryno-600 px-4 text-sm font-medium text-white transition-colors hover:bg-ryno-700"
          >
            Back to the dashboard
          </Link>
        }
      />
    </Card>
  );
}
