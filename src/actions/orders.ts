"use server";

import { revalidateTag, updateTag } from "next/cache";

import { ApiError, apiFetch } from "@/lib/api/http";
import { CACHE_TAGS } from "@/lib/api/tags";
import type { Envelope, OrderDetail, OrderStatus } from "@/lib/api/types";

/**
 * Every write the Order Details page can make.
 *
 * Two rules hold across all of them:
 *
 *  1. They return a result object, never throw. A thrown Server Action becomes
 *     an opaque digest in production; the API's `error.message` is written to
 *     be shown to a vendor, so it is carried back deliberately.
 *  2. Every successful write returns the full updated order, which is handed
 *     straight back to the client. The screen updates from the response, with
 *     no second fetch and no manual refresh.
 */

export type ActionResult =
  | { ok: true; order: OrderDetail }
  | { ok: false; message: string; code: string; conflict: boolean };

type Failure = Extract<ActionResult, { ok: false }>;

function failure(error: unknown): Failure {
  if (error instanceof ApiError) {
    return {
      ok: false,
      message: error.message,
      code: error.code,
      conflict: error.isConflict,
    };
  }
  return {
    ok: false,
    message: "Something went wrong. Please try again.",
    code: "unknown_error",
    conflict: false,
  };
}

/**
 * Invalidates everything derived from this order.
 *
 * `updateTag` rather than `revalidateTag` for the order collection: the vendor
 * who just accepted an order must see it accepted, not a stale copy that
 * refreshes a moment later. Reviews can afford stale-while-revalidate.
 */
function invalidateOrder(orderNo: string) {
  updateTag(CACHE_TAGS.orders);
  updateTag(CACHE_TAGS.order(orderNo));
}

async function writeOrder(
  orderNo: string,
  path: string,
  init: { method: "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown },
): Promise<ActionResult> {
  try {
    const response = await apiFetch<Envelope<OrderDetail>>(path, init);
    invalidateOrder(orderNo);
    return { ok: true, order: response.data };
  } catch (error) {
    return failure(error);
  }
}

const encode = encodeURIComponent;

export async function updateOrderStatus(
  orderNo: string,
  status: OrderStatus,
  reason?: string,
): Promise<ActionResult> {
  return writeOrder(orderNo, `/v1/orders/${encode(orderNo)}/status`, {
    method: "PATCH",
    body: reason ? { status, reason } : { status },
  });
}

export async function assignDriver(
  orderNo: string,
  driverId: string,
): Promise<ActionResult> {
  return writeOrder(orderNo, `/v1/orders/${encode(orderNo)}/driver`, {
    method: "PUT",
    body: { driver_id: driverId },
  });
}

export async function removeDriver(orderNo: string): Promise<ActionResult> {
  return writeOrder(orderNo, `/v1/orders/${encode(orderNo)}/driver`, {
    method: "DELETE",
  });
}

export async function setItemAvailability(
  orderNo: string,
  orderItemId: string,
  status: "available" | "not_available",
): Promise<ActionResult> {
  return writeOrder(
    orderNo,
    `/v1/orders/${encode(orderNo)}/items/${encode(orderItemId)}`,
    { method: "PATCH", body: { status } },
  );
}

export async function addSubstituteItem(
  orderNo: string,
  itemId: string,
  quantity: number,
): Promise<ActionResult> {
  return writeOrder(orderNo, `/v1/orders/${encode(orderNo)}/items`, {
    method: "POST",
    body: { item_id: itemId, quantity },
  });
}

export async function removeSubstituteItem(
  orderNo: string,
  orderItemId: string,
): Promise<ActionResult> {
  return writeOrder(
    orderNo,
    `/v1/orders/${encode(orderNo)}/items/${encode(orderItemId)}`,
    { method: "DELETE" },
  );
}

export type SimpleResult = { ok: true } | Failure;

/** Archiving sends the vendor back to the list, so there is no order to return. */
export async function archiveOrder(orderNo: string): Promise<SimpleResult> {
  try {
    await apiFetch(`/v1/orders/${encode(orderNo)}`, { method: "DELETE" });
    invalidateOrder(orderNo);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function restoreOrder(orderNo: string): Promise<SimpleResult> {
  try {
    await apiFetch(`/v1/orders/${encode(orderNo)}/restore`, { method: "POST" });
    invalidateOrder(orderNo);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/**
 * The "someone else changed this order" path: pulls the current record so the
 * page can re-render from the truth instead of guessing.
 */
export async function refetchOrder(orderNo: string): Promise<ActionResult> {
  try {
    const response = await apiFetch<Envelope<OrderDetail>>(
      `/v1/orders/${encode(orderNo)}`,
    );
    revalidateTag(CACHE_TAGS.order(orderNo), "max");
    return { ok: true, order: response.data };
  } catch (error) {
    return failure(error);
  }
}
