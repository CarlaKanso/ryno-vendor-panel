import { Suspense } from "react";

import { ShopSettings } from "@/components/products/shop-settings";
import { PageHeader } from "@/components/shell/page-header";
import { CardSkeleton } from "@/components/ui/skeleton";
import { getShops } from "@/lib/api/vendor";

export const metadata = { title: "Shops" };

/** Bonus: per-branch settings — about, phone, address and open/closed. */
export default function ShopsPage() {
  return (
    <>
      <PageHeader
        title="Shops"
        description="Branch details customers see, and whether each one is taking orders."
      />
      <Suspense
        fallback={
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <CardSkeleton key={index} className="h-[420px]" />
            ))}
          </div>
        }
      >
        <Branches />
      </Suspense>
    </>
  );
}

async function Branches() {
  const shops = await getShops();
  return <ShopSettings shops={shops} />;
}
