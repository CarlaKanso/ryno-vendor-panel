import { Suspense } from "react";

import { ProductsBoard } from "@/components/products/products-board";
import { PageHeader } from "@/components/shell/page-header";
import { TableSkeleton } from "@/components/ui/skeleton";
import { getItems } from "@/lib/api/items";
import { getCategoryTree, getVendor } from "@/lib/api/vendor";
import { groupSubCategories } from "@/lib/categories";

export const metadata = { title: "Products" };

/** Bonus: the product catalogue — list, search, create, edit, soft delete. */
export default function ProductsPage() {
  return (
    <>
      <PageHeader
        title="Products"
        description="Your catalogue across every branch. Discontinued products stay on past orders."
      />
      <Suspense
        fallback={
          <div className="overflow-hidden rounded-card border border-ink-200/80 bg-white shadow-card">
            <TableSkeleton rows={8} columns={5} />
          </div>
        }
      >
        <Catalogue />
      </Suspense>
    </>
  );
}

async function Catalogue() {
  const [result, categories, vendor] = await Promise.all([
    // The catalogue is small enough to hand over in one page; the search and
    // the create dialog both work from it without another round trip.
    getItems({ perPage: 100 }),
    getCategoryTree(),
    getVendor(),
  ]);

  return (
    <ProductsBoard
      items={result.data}
      subCategoryGroups={groupSubCategories(categories.all)}
      currency={vendor.currency}
    />
  );
}
