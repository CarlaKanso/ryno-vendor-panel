"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import type { TopItem, TopShop } from "@/lib/analytics";
import { formatCount, formatMoney } from "@/lib/money";

type Tab = "shops" | "items";

/**
 * Top Shops / Top Items.
 *
 * Both rankings are computed server-side from the same snapshot, so switching
 * tabs is instant and costs nothing — worth it for a panel someone flicks
 * between all day.
 */
export function TopSelling({
  shops,
  items,
  currency = "GHS",
}: {
  shops: TopShop[];
  items: TopItem[];
  currency?: string;
}) {
  const [tab, setTab] = useState<Tab>("shops");

  const maxSales = Math.max(...shops.map((shop) => shop.totalSales), 1);
  const maxQuantity = Math.max(...items.map((item) => item.quantity), 1);

  return (
    <div className="flex h-full min-w-0 flex-col rounded-card border border-ink-200/80 bg-white shadow-card">
      <div className="border-b border-ink-200/70 px-5 pt-4">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">
          Top Selling
        </h2>

        <div className="mt-3 flex gap-1" role="tablist" aria-label="Top selling">
          {(["shops", "items"] as const).map((option) => (
            <button
              key={option}
              role="tab"
              type="button"
              aria-selected={tab === option}
              onClick={() => setTab(option)}
              className={cn(
                "relative px-3 pb-2.5 pt-1 text-sm font-medium transition-colors",
                tab === option ? "text-ryno-700" : "text-ink-500 hover:text-ink-800",
              )}
            >
              {option === "shops" ? "Top Shops" : "Top Items"}
              {tab === option ? (
                <motion.span
                  layoutId="top-selling-underline"
                  transition={{ type: "spring", stiffness: 480, damping: 36 }}
                  className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-ryno-600"
                  aria-hidden
                />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-5 py-4">
        {/* Re-keying on the tab remounts the list, which replays the CSS
            rise. The sliding underline above still needs JS — a shared layout
            transition is the one thing CSS cannot express. */}
        <ul key={tab} className="rise-in space-y-3">
            {tab === "shops" ? (
              shops.length === 0 ? (
                <EmptyState compact title="No shop data yet" />
              ) : (
                shops.map((shop, index) => (
                  <li key={shop.shopId}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-medium text-ink-800">
                        <span className="mr-2 text-xs text-ink-400 tabular">
                          {index + 1}
                        </span>
                        {shop.name}
                      </p>
                      <p className="shrink-0 text-sm font-semibold text-ink-900 tabular">
                        {formatMoney(shop.totalSales, currency)}
                      </p>
                    </div>
                    <Meter value={shop.totalSales / maxSales} delay={index * 0.06} />
                    <p className="mt-1 text-xs text-ink-400 tabular">
                      {formatCount(shop.orders)}{" "}
                      {shop.orders === 1 ? "order" : "orders"}
                    </p>
                  </li>
                ))
              )
            ) : items.length === 0 ? (
              <EmptyState compact title="No items sold yet" />
            ) : (
              items.map((item, index) => (
                <li key={item.itemId} className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-100 ring-1 ring-ink-200">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        width={40}
                        height={40}
                        className="size-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-[11px] font-semibold text-ink-400">
                        {index + 1}
                      </span>
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-medium text-ink-800">
                        {item.name}
                      </p>
                      <p className="shrink-0 text-sm font-semibold text-ink-900 tabular">
                        {formatCount(item.quantity)} sold
                      </p>
                    </div>
                    <Meter value={item.quantity / maxQuantity} delay={index * 0.06} />
                    <p className="mt-1 text-xs text-ink-400 tabular">
                      {formatMoney(item.revenue, currency)}
                    </p>
                  </div>
                </li>
              ))
            )}
        </ul>
      </div>
    </div>
  );
}

/** A bar that grows from zero, so the ranking reads at a glance. */
function Meter({ value, delay }: { value: number; delay: number }) {
  return (
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
      <div
        className="grow-x h-full rounded-full bg-gradient-to-r from-ryno-500 to-gold-400"
        style={{
          width: `${Math.max(value, 0.02) * 100}%`,
          animationDelay: `${delay}s`,
        }}
      />
    </div>
  );
}
