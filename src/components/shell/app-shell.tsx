"use client";

import { Menu } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";

import type { Vendor } from "@/lib/api/types";
import { Breadcrumbs } from "./breadcrumbs";
import { Sidebar } from "./sidebar";

/**
 * The chrome every panel page sits in: rail, top bar, breadcrumbs.
 *
 * The vendor is fetched once in the layout (a Server Component) and passed in,
 * so this client boundary stays about interaction — the drawer, the collapse
 * preference, the page transition — and never about data.
 */
export function AppShell({
  vendor,
  children,
}: {
  vendor: Vendor;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        vendorName={vendor.name}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobile}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-ink-200/80 bg-white/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="-ml-1 rounded-lg p-2 text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-5" aria-hidden />
            </button>

            <div className="flex min-w-0 items-center gap-3">
              {vendor.logo_url ? (
                <Image
                  src={vendor.logo_url}
                  alt=""
                  width={36}
                  height={36}
                  className="size-9 shrink-0 rounded-lg object-cover ring-1 ring-ink-200"
                  unoptimized
                />
              ) : null}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight text-ink-900">
                  {vendor.name}
                </p>
                <p className="truncate text-xs text-ink-500">Vendor Panel</p>
              </div>
            </div>

            <div className="ml-auto hidden min-w-0 sm:block">
              <Breadcrumbs />
            </div>
          </div>

          <div className="border-t border-ink-200/70 px-4 py-2 sm:hidden">
            <Breadcrumbs />
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          {/* Re-keying on the pathname remounts this node, which replays the
              CSS rise on each navigation. No exit animation on purpose:
              holding the old page back would delay the new one for the sake
              of a flourish. */}
          <div key={pathname} className="rise-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
