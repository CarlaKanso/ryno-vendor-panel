import { Check, X } from "lucide-react";

import { cn } from "@/lib/cn";
import type { OrderDetail } from "@/lib/api/types";
import { formatDateTime } from "@/lib/dates";
import { ACTIVITY_LABELS, TIMELINE_EVENT_SET, TIMELINE_STEPS } from "@/lib/status";

/**
 * Order Tracking Details.
 *
 * Steps come from the fixed list in the brief; `events` supplies which ones
 * have happened and when. Anything not yet in `events` is greyed out, and a
 * cancelled or refunded order replaces the tail with a single red end step.
 *
 * Everything else in `events` — driver unassigned, item swapped, archived — is
 * an audit trail rather than a stage, so it goes in the Activity list below.
 */
export function OrderTimeline({ order }: { order: OrderDetail }) {
  const eventByType = new Map<string, string>();
  for (const event of order.events) {
    // First occurrence wins: an event repeated after a driver change should
    // still show when the stage was first reached.
    if (!eventByType.has(event.type)) eventByType.set(event.type, event.created_at);
  }

  const terminated =
    order.status === "cancelled"
      ? ("cancelled" as const)
      : order.status === "refunded"
        ? ("refunded" as const)
        : null;

  const steps = TIMELINE_STEPS.map((step) => ({
    ...step,
    at: eventByType.get(step.type) ?? null,
  }));

  const totalSteps = TIMELINE_STEPS.length + (terminated ? 1 : 0);
  const reached = steps.filter((step) => step.at !== null).length + (terminated ? 1 : 0);
  // Each step sits centred in its own column, so the connector has to stop at
  // the centre of the last completed one: (reached - 0.5) columns along.
  const progress = Math.max(0, Math.min(1, (reached - 0.5) / totalSteps));

  const activity = order.events.filter((event) => !TIMELINE_EVENT_SET.has(event.type));

  return (
    <div className="rounded-card border border-ink-200/80 bg-white shadow-card">
      <div className="border-b border-ink-200/70 px-5 py-4">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">
          Order Tracking Details
        </h2>
      </div>

      <div className="px-5 py-6">
        <ol className="relative flex flex-col gap-6 sm:flex-row sm:gap-0">
          {/* The rail, and the line that fills along it. Two elements
              rather than one: the layout is a vertical list on a phone and a
              horizontal tracker from `sm` up, and animating width and height
              on the same node would mean fighting the breakpoint. */}
          <div
            className="absolute bottom-2 left-[15px] top-2 w-0.5 rounded bg-ink-200 sm:hidden"
            aria-hidden
          >
            <div
              className={cn(
                "grow-y w-full rounded bg-ryno-600",
                terminated && "bg-red-500",
              )}
              style={{ height: `${progress * 100}%` }}
            />
          </div>
          <div
            className="absolute left-0 right-0 top-[15px] hidden h-0.5 rounded bg-ink-200 sm:block"
            aria-hidden
          >
            <div
              className={cn(
                "grow-x h-full rounded bg-ryno-600",
                terminated && "bg-red-500",
              )}
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          {steps.map((step, index) => {
            const done = step.at !== null;
            return (
              <li
                key={step.type}
                className="relative flex flex-1 items-start gap-3 sm:flex-col sm:items-center sm:gap-2 sm:text-center"
              >
                <span
                  style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
                  className={cn(
                    "pop-in relative z-10 grid size-8 shrink-0 place-items-center rounded-full ring-4 ring-white",
                    done
                      ? "bg-ryno-600 text-white"
                      : "bg-ink-100 text-ink-400 ring-white",
                  )}
                >
                  {done ? (
                    <Check className="size-4" aria-hidden />
                  ) : (
                    <span className="size-1.5 rounded-full bg-ink-400" aria-hidden />
                  )}
                </span>

                <div className="min-w-0 sm:px-1">
                  <p
                    className={cn(
                      "text-[13px] font-medium leading-tight",
                      done ? "text-ink-900" : "text-ink-400",
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    {step.at ? formatDateTime(step.at) : "Pending"}
                  </p>
                </div>
              </li>
            );
          })}

          {terminated ? (
            <li className="relative flex flex-1 items-start gap-3 sm:flex-col sm:items-center sm:gap-2 sm:text-center">
              <span
                style={{ animationDelay: "300ms" }}
                className="pop-in relative z-10 grid size-8 shrink-0 place-items-center rounded-full bg-red-600 text-white ring-4 ring-white"
              >
                <X className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 sm:px-1">
                <p className="text-[13px] font-medium leading-tight text-red-700">
                  {terminated === "cancelled" ? "Cancelled" : "Refunded"}
                </p>
                <p className="mt-0.5 text-xs text-ink-400">
                  {formatDateTime(
                    terminated === "cancelled" ? order.cancelled_at : order.refunded_at,
                  )}
                </p>
                {(terminated === "cancelled" ? order.cancel_reason : order.refund_reason) ? (
                  <p className="mt-1 text-xs italic text-ink-500">
                    {terminated === "cancelled"
                      ? order.cancel_reason
                      : order.refund_reason}
                  </p>
                ) : null}
              </div>
            </li>
          ) : null}
        </ol>
      </div>

      {activity.length > 0 ? (
        <div className="border-t border-ink-200/70 px-5 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Activity
          </h3>
          <ul className="mt-3 space-y-2">
            {activity.map((event, index) => (
              <li
                key={`${event.type}-${event.created_at}-${index}`}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
              >
                <span className="size-1.5 shrink-0 rounded-full bg-ink-300" aria-hidden />
                <span className="text-ink-700">
                  {ACTIVITY_LABELS[event.type] ?? event.type.replace(/_/g, " ")}
                </span>
                {event.note ? (
                  <span className="text-ink-500">— {event.note}</span>
                ) : null}
                <span className="ml-auto text-xs text-ink-400">
                  {formatDateTime(event.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
