"use client";

import { Bike, FileText, Trash2, UserMinus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  archiveOrder,
  assignDriver,
  removeDriver,
  updateOrderStatus,
} from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/field";
import type { OrderDetail, OrderStatus, Person } from "@/lib/api/types";
import {
  CANCEL_REASONS,
  DESTRUCTIVE_TRANSITIONS,
  REFUND_REASONS,
  TRANSITION_LABELS,
} from "@/lib/status";
import { ReasonDialog } from "./reason-dialog";
import type { RunAction } from "./use-order-actions";

/**
 * The action bar on Order Details.
 *
 * The golden rule from the brief: the status buttons are rendered straight
 * from `allowed_transitions`, so the workflow lives on the server. Nothing
 * here knows that `accepted` follows `pending` — if the API adds a state
 * tomorrow, a button for it appears without a change to this file.
 */

const ARCHIVABLE: OrderStatus[] = ["completed", "cancelled", "refunded"];

export function OrderActions({
  order,
  drivers,
  run,
  pendingAction,
}: {
  order: OrderDetail;
  drivers: Person[];
  run: RunAction;
  pendingAction: string | null;
}) {
  const router = useRouter();

  const [reasonFor, setReasonFor] = useState<OrderStatus | null>(null);
  const [driverOpen, setDriverOpen] = useState(false);
  const [confirmRemoveDriver, setConfirmRemoveDriver] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState("");

  const transitions = order.allowed_transitions ?? [];
  const safeTransitions = transitions.filter(
    (status) => !DESTRUCTIVE_TRANSITIONS.includes(status),
  );
  const riskyTransitions = transitions.filter((status) =>
    DESTRUCTIVE_TRANSITIONS.includes(status),
  );

  // The API allows a driver change while the order is still in the shop.
  const canChangeDriver = (["pending", "accepted", "ready_for_pickup"] as string[]).includes(
    order.status,
  );
  const canArchive = ARCHIVABLE.includes(order.status) && !order.archived_at;

  const activeDrivers = drivers.filter((driver) => driver.is_active !== false);

  const archive = async () => {
    setArchiving(true);
    const result = await archiveOrder(order.order_no);
    setArchiving(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(`Order #${order.order_no} archived`);
    setConfirmArchive(false);
    router.push("/orders");
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium uppercase tracking-wide text-ink-500">
          Actions
        </span>

        {safeTransitions.map((status) => (
          <Button
            key={status}
            variant="primary"
            loading={pendingAction === `status:${status}`}
            disabled={pendingAction !== null}
            onClick={() =>
              void run(
                `status:${status}`,
                () => updateOrderStatus(order.order_no, status),
                {
                  success: `Order marked ${TRANSITION_LABELS[status]
                    .toLowerCase()
                    .replace(/^mark /, "")}`,
                },
              )
            }
          >
            {TRANSITION_LABELS[status]}
          </Button>
        ))}

        {canChangeDriver ? (
          <Button
            variant="secondary"
            disabled={pendingAction !== null}
            onClick={() => {
              setSelectedDriver(order.driver?.id ?? "");
              setDriverOpen(true);
            }}
            icon={<Bike className="size-4 text-ryno-600" aria-hidden />}
          >
            {order.driver ? "Change driver" : "Assign driver"}
          </Button>
        ) : null}

        {canChangeDriver && order.driver ? (
          <Button
            variant="ghost"
            disabled={pendingAction !== null}
            onClick={() => setConfirmRemoveDriver(true)}
            icon={<UserMinus className="size-4" aria-hidden />}
          >
            Remove driver
          </Button>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Link
            href={`/orders/${order.order_no}/invoice`}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-gold-400 px-4 text-sm font-medium text-ryno-900 shadow-sm transition-colors hover:bg-gold-300"
          >
            <FileText className="size-4" aria-hidden />
            Generate Invoice
          </Link>

          {riskyTransitions.map((status) => (
            <Button
              key={status}
              variant="danger"
              disabled={pendingAction !== null}
              loading={pendingAction === `status:${status}`}
              onClick={() => setReasonFor(status)}
            >
              {TRANSITION_LABELS[status]}
            </Button>
          ))}

          {canArchive ? (
            <Button
              variant="ghost"
              disabled={pendingAction !== null}
              onClick={() => setConfirmArchive(true)}
              icon={<Trash2 className="size-4" aria-hidden />}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Archive
            </Button>
          ) : null}
        </div>
      </div>

      {transitions.length === 0 && !canArchive ? (
        <p className="mt-3 text-sm text-ink-500">
          This order has reached the end of its workflow — there is nothing left to
          change.
        </p>
      ) : null}

      <ReasonDialog
        open={reasonFor !== null}
        onClose={() => setReasonFor(null)}
        title={reasonFor === "refunded" ? "Refund this order?" : "Cancel this order?"}
        description={
          reasonFor === "refunded"
            ? "The customer is refunded the full order total. This cannot be undone."
            : "The customer is told the order will not arrive. This cannot be undone."
        }
        reasons={reasonFor === "refunded" ? REFUND_REASONS : CANCEL_REASONS}
        confirmLabel={reasonFor === "refunded" ? "Refund order" : "Cancel order"}
        loading={pendingAction === `status:${reasonFor}`}
        onConfirm={(reason) => {
          const status = reasonFor;
          if (!status) return;
          void run(
            `status:${status}`,
            () => updateOrderStatus(order.order_no, status, reason),
            {
              success:
                status === "refunded" ? "Order refunded" : "Order cancelled",
              onSuccess: () => setReasonFor(null),
            },
          );
        }}
      />

      <Modal
        open={driverOpen}
        onClose={() => setDriverOpen(false)}
        title={order.driver ? "Change driver" : "Assign a driver"}
        description="Only drivers who are currently active can take a job."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDriverOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!selectedDriver || selectedDriver === order.driver?.id}
              loading={pendingAction === "driver:assign"}
              onClick={() =>
                void run(
                  "driver:assign",
                  () => assignDriver(order.order_no, selectedDriver),
                  {
                    success: "Driver assigned",
                    onSuccess: () => setDriverOpen(false),
                  },
                )
              }
            >
              Assign driver
            </Button>
          </>
        }
      >
        <label
          htmlFor="driver-select"
          className="mb-1.5 block text-xs font-medium text-ink-600"
        >
          Driver
        </label>
        <Select
          id="driver-select"
          value={selectedDriver}
          onChange={(event) => setSelectedDriver(event.target.value)}
        >
          <option value="">Select a driver…</option>
          {activeDrivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.full_name}
              {driver.address ? ` — ${driver.address}` : ""}
            </option>
          ))}
        </Select>
      </Modal>

      <ConfirmDialog
        open={confirmRemoveDriver}
        onClose={() => setConfirmRemoveDriver(false)}
        title="Remove the driver?"
        description={`${order.driver?.full_name ?? "The driver"} will be unassigned from this order. You'll need to assign someone before it can go on the way.`}
        confirmLabel="Remove driver"
        loading={pendingAction === "driver:remove"}
        onConfirm={() =>
          void run("driver:remove", () => removeDriver(order.order_no), {
            success: "Driver removed",
            onSuccess: () => setConfirmRemoveDriver(false),
          })
        }
      />

      <ConfirmDialog
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        title="Archive this order?"
        description="It disappears from the main list and stops counting towards your KPIs. You can restore it from the archived view."
        confirmLabel="Archive order"
        loading={archiving}
        onConfirm={archive}
      />
    </Card>
  );
}
