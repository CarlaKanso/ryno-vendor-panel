"use client";

import { Archive } from "lucide-react";
import { motion } from "motion/react";

import { riseIn, staggerContainer } from "@/components/motion/variants";
import { Tag } from "@/components/ui/badge";
import type { OrderDetail, Person } from "@/lib/api/types";
import { OrderPeopleCards } from "./detail-cards";
import { OrderActions } from "./order-actions";
import { OrderSummary } from "./order-summary";
import { OrderTimeline } from "./order-timeline";
import { ProductList } from "./product-list";
import { useOrderActions } from "./use-order-actions";

/**
 * The client boundary for Order Details.
 *
 * The page fetches the order on the server and hands it in here; from that
 * point one piece of state is the order, and every section reads from it. A
 * write replaces that state with the API's response, so the whole page — the
 * timeline, the totals, the lines, the available actions — moves together.
 */
export function OrderWorkspace({
  initialOrder,
  drivers,
}: {
  initialOrder: OrderDetail;
  drivers: Person[];
}) {
  const { order, run, pendingAction } = useOrderActions(initialOrder);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {order.archived_at ? (
        <motion.div
          variants={riseIn}
          className="flex items-center gap-2 rounded-card border border-gold-300 bg-gold-50 px-4 py-3 text-sm text-gold-900"
        >
          <Archive className="size-4 shrink-0" aria-hidden />
          This order is archived. Restore it from the archived view in the order list to
          act on it again.
          <Tag tone="gold" className="ml-auto">
            Archived
          </Tag>
        </motion.div>
      ) : null}

      <motion.div variants={riseIn}>
        <OrderActions
          order={order}
          drivers={drivers}
          run={run}
          pendingAction={pendingAction}
        />
      </motion.div>

      <motion.div variants={riseIn}>
        <OrderTimeline order={order} />
      </motion.div>

      <motion.div variants={riseIn}>
        <OrderSummary order={order} />
      </motion.div>

      <motion.div variants={riseIn}>
        <OrderPeopleCards order={order} />
      </motion.div>

      <motion.div variants={riseIn}>
        <ProductList order={order} run={run} pendingAction={pendingAction} />
      </motion.div>
    </motion.div>
  );
}
