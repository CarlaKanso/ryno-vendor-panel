"use client";

import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useMemo } from "react";

const SEGMENT_LABELS: Record<string, string> = {
  orders: "Orders",
  reviews: "Reviews",
  products: "Products",
  shops: "Shops",
  invoice: "Invoice",
};

/**
 * Breadcrumbs derived from the path.
 *
 * Deriving them beats threading a prop through every page, and the only
 * segment that is not a known word is an order number, which reads fine as
 * "#42910567".
 */
export function Breadcrumbs() {
  const pathname = usePathname();

  const crumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    return segments.map((segment, index) => ({
      href: `/${segments.slice(0, index + 1).join("/")}`,
      label: SEGMENT_LABELS[segment] ?? `#${segment}`,
      isLast: index === segments.length - 1,
    }));
  }, [pathname]);

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1.5 text-sm text-ink-500">
        <li>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded transition-colors hover:text-ryno-700"
          >
            <Home className="size-3.5" aria-hidden />
            <span className={crumbs.length === 0 ? "font-medium text-ink-800" : ""}>
              Dashboard
            </span>
          </Link>
        </li>

        {crumbs.map((crumb) => (
          <Fragment key={crumb.href}>
            <ChevronRight className="size-3.5 shrink-0 text-ink-300" aria-hidden />
            <li className="min-w-0">
              {crumb.isLast ? (
                <span
                  aria-current="page"
                  className="block truncate font-medium text-ink-800"
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="block truncate transition-colors hover:text-ryno-700"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
