import { notFound } from "next/navigation";
import { Suspense } from "react";

import { OrderWorkspace } from "@/components/order-detail/order-workspace";
import { PageHeader } from "@/components/shell/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/http";
import { getOrder } from "@/lib/api/orders";
import { getDrivers } from "@/lib/api/vendor";
import { formatDateTime } from "@/lib/dates";

export async function generateMetadata({ params }: PageProps<"/orders/[orderNo]">) {
  const { orderNo } = await params;
  return { title: `Order #${orderNo}` };
}

/**
 * `params` is awaited inside the boundary, not in the page body, so the
 * heading and the skeleton are part of the prerendered shell and the order
 * itself streams in behind them.
 */
export default function OrderDetailPage({ params }: PageProps<"/orders/[orderNo]">) {
  return (
    <Suspense fallback={<OrderSkeleton />}>
      <OrderDetail params={params} />
    </Suspense>
  );
}

async function OrderDetail({
  params,
}: {
  params: PageProps<"/orders/[orderNo]">["params"];
}) {
  const { orderNo } = await params;

  // The drivers list is cached and the assign dialog needs it, so it is
  // fetched alongside the order rather than on first click. `allSettled`
  // because the two failures mean different things: a missing order is a 404,
  // while a failed driver list should only cost the assign dialog its options.
  const [orderResult, driversResult] = await Promise.allSettled([
    getOrder(orderNo),
    getDrivers(),
  ]);

  if (orderResult.status === "rejected") {
    const error = orderResult.reason;
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  const order = orderResult.value;
  const drivers = driversResult.status === "fulfilled" ? driversResult.value : [];

  return (
    <>
      <PageHeader
        title={`Order #${order.order_no}`}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusBadge status={order.status} />
            <span aria-hidden>·</span>
            <span>{order.shop.name}</span>
            <span aria-hidden>·</span>
            <span>{formatDateTime(order.created_at)}</span>
          </span>
        }
      />
      <OrderWorkspace initialOrder={order} drivers={drivers} />
    </>
  );
}

function OrderSkeleton() {
  return (
    <>
      <PageHeader title="Order" description="Loading…" />
      <div className="space-y-4">
        <Skeleton className="h-[72px] w-full rounded-card" />
        <Skeleton className="h-[180px] w-full rounded-card" />
        <Skeleton className="h-[260px] w-full rounded-card" />
        <div className="grid gap-4 lg:grid-cols-2">
          <CardSkeleton className="h-[200px]" />
          <CardSkeleton className="h-[200px]" />
        </div>
      </div>
    </>
  );
}
