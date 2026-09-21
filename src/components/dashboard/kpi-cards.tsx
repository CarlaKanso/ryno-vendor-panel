"use client";

import {
  BadgeCent,
  CheckCircle2,
  ShoppingBag,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";

import { AnimatedNumber } from "@/components/motion/animated-number";
import { riseIn, staggerContainer } from "@/components/motion/variants";
import { cn } from "@/lib/cn";
import { formatAmount, formatCount } from "@/lib/money";
import type { Kpis } from "@/lib/analytics";

/** Stable formatters: `AnimatedNumber` takes `format` as an effect dependency. */
const formatWholeCount = (value: number) => formatCount(Math.round(value));

type CardSpec = {
  key: keyof Kpis;
  label: string;
  hint: string;
  icon: LucideIcon;
  tone: string;
  money?: boolean;
};

const CARDS: CardSpec[] = [
  {
    key: "totalOrders",
    label: "Total Orders",
    hint: "Any status",
    icon: ShoppingBag,
    tone: "bg-ryno-50 text-ryno-700",
  },
  {
    key: "delivered",
    label: "Delivered",
    hint: "Completed orders",
    icon: CheckCircle2,
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    key: "cancelled",
    label: "Cancelled",
    hint: "Cancelled orders",
    icon: XCircle,
    tone: "bg-red-50 text-red-600",
  },
  {
    key: "totalSales",
    label: "Total Sales",
    hint: "Gross on completed orders",
    icon: BadgeCent,
    tone: "bg-gold-100 text-gold-700",
    money: true,
  },
  {
    key: "revenue",
    label: "Revenue",
    hint: "Your earnings after commission",
    icon: Wallet,
    tone: "bg-ryno-100 text-ryno-700",
    money: true,
  },
];

export function KpiCards({ kpis, currency = "GHS" }: { kpis: Kpis; currency?: string }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
    >
      {CARDS.map((card) => {
        const Icon = card.icon;
        const value = kpis[card.key];

        return (
          <motion.div
            key={card.key}
            variants={riseIn}
            whileHover={{ y: -3 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="rounded-card border border-ink-200/80 bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-ink-900 tabular">
                  {card.money ? (
                    <>
                      <span className="mr-1 text-sm font-semibold text-ink-400">
                        {currency}
                      </span>
                      <AnimatedNumber value={value} format={formatAmount} />
                    </>
                  ) : (
                    <AnimatedNumber value={value} format={formatWholeCount} />
                  )}
                </p>
                <p className="mt-1 text-xs text-ink-400">{card.hint}</p>
              </div>

              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-xl",
                  card.tone,
                )}
                aria-hidden
              >
                <Icon className="size-5" />
              </span>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
