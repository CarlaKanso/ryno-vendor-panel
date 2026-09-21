/**
 * Order status presentation — labels and badge colours, in one place so the
 * dashboard, the list, the detail page and the Excel export agree.
 * Colours follow section 7 of the brief.
 */

import type { OrderStatus } from "./api/types";

type StatusStyle = {
  label: string;
  /** Badge classes: background, text, ring. */
  badge: string;
  /** A single colour for dots, timelines and chart accents. */
  dot: string;
};

export const ORDER_STATUS_STYLES: Record<OrderStatus, StatusStyle> = {
  pending: {
    label: "Pending",
    badge: "bg-ink-100 text-ink-700 ring-ink-200",
    dot: "bg-ink-400",
  },
  accepted: {
    label: "Accepted",
    badge: "bg-blue-50 text-blue-700 ring-blue-200",
    dot: "bg-blue-500",
  },
  ready_for_pickup: {
    label: "Ready To Pickup",
    badge: "bg-purple-50 text-purple-700 ring-purple-200",
    dot: "bg-purple-500",
  },
  on_the_way: {
    label: "On The Way",
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
    dot: "bg-amber-500",
  },
  completed: {
    label: "Completed",
    badge: "bg-ryno-50 text-ryno-700 ring-ryno-200",
    dot: "bg-ryno-600",
  },
  cancelled: {
    label: "Cancelled",
    badge: "bg-red-50 text-red-700 ring-red-200",
    dot: "bg-red-500",
  },
  refunded: {
    label: "Refunded",
    badge: "bg-red-100 text-red-900 ring-red-300",
    dot: "bg-red-800",
  },
};

export function statusLabel(status: string): string {
  return (
    ORDER_STATUS_STYLES[status as OrderStatus]?.label ??
    status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/** Labels for the buttons that move an order to a given status. */
export const TRANSITION_LABELS: Record<OrderStatus, string> = {
  pending: "Mark pending",
  accepted: "Accept order",
  ready_for_pickup: "Mark ready for pickup",
  on_the_way: "Mark on the way",
  completed: "Mark completed",
  cancelled: "Cancel order",
  refunded: "Refund order",
};

/** Transitions that need a reason and a confirmation step. */
export const DESTRUCTIVE_TRANSITIONS: OrderStatus[] = ["cancelled", "refunded"];

export const CANCEL_REASONS = [
  "Customer changed mind",
  "Items out of stock",
  "Shop is closed",
  "Customer unreachable",
  "Delivery address unreachable",
  "Duplicate order",
] as const;

export const REFUND_REASONS = [
  "Items damaged on arrival",
  "Wrong items delivered",
  "Order arrived late",
  "Quality complaint",
  "Customer dispute resolved in their favour",
] as const;

/**
 * Timeline steps, in the order the brief lists them. `events` supplies the
 * timestamps; anything not yet in `events` renders greyed out.
 */
export const TIMELINE_STEPS = [
  { type: "ordered", label: "Ordered" },
  { type: "waiting_for_confirmation", label: "Waiting For Confirmation" },
  { type: "accepted_by_picker", label: "Accepted By Picker" },
  { type: "accepted_by_driver", label: "Accepted By Driver" },
  { type: "ready_to_pickup", label: "Ready To Pickup" },
  { type: "picked_up_by_driver", label: "Pick up By Driver" },
  { type: "completed", label: "Completed" },
] as const;

export const ACTIVITY_LABELS: Record<string, string> = {
  driver_unassigned: "Driver unassigned",
  driver_assigned: "Driver assigned",
  item_unavailable: "Item marked not available",
  item_available: "Item marked available",
  item_added: "Substitute item added",
  item_removed: "Substitute item removed",
  archived: "Order archived",
  restored: "Order restored",
};

/** Event types that belong on the main timeline rather than the activity log. */
export const TIMELINE_EVENT_SET = new Set<string>([
  ...TIMELINE_STEPS.map((step) => step.type),
  "cancelled",
  "refunded",
]);
