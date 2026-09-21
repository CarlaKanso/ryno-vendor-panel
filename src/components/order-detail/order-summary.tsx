import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { OrderDetail } from "@/lib/api/types";
import { formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { DetailRow } from "./detail-cards";

/** Order Basic Details — the label/field table from section 4.3 of the brief. */
export function OrderSummary({ order }: { order: OrderDetail }) {
  const currency = order.currency ?? "GHS";

  return (
    <Card>
      <div className="border-b border-ink-200/70 px-5 py-4">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">
          Order Basic Details
        </h2>
      </div>

      <dl className="grid gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-3">
        <DetailRow label="Order No" value={order.order_no} />
        <DetailRow label="Order Code" value={order.order_code ?? "—"} />
        <DetailRow label="Order Status" value={<StatusBadge status={order.status} />} />

        <DetailRow
          label="Delivery Address"
          value={order.delivery_address ?? "Not defined"}
        />
        <DetailRow
          label="Shipping Address"
          value={order.shipping_address ?? "Not defined"}
        />
        <DetailRow label="Instruction" value={order.instruction ?? "Not defined"} />

        <DetailRow label="Total Quantity" value={order.item_count} />
        <DetailRow label="Promocode" value={order.promo_code ?? "Not Applied"} />
        <DetailRow
          label="Promocode Discount"
          value={order.promo_code ? formatMoney(order.discount, currency) : "Not Applied"}
        />

        <DetailRow label="Total Amount" value={formatMoney(order.subtotal, currency)} />
        <DetailRow label="Discount Amount" value={formatMoney(order.discount, currency)} />
        <DetailRow
          label="Delivery Charge"
          value={formatMoney(order.delivery_fee, currency)}
        />

        <DetailRow
          label="Total Gross Amount"
          value={
            <span className="text-base font-bold text-ryno-700">
              {formatMoney(order.total, currency)}
            </span>
          }
        />
        <DetailRow
          label="Refunded Amount"
          value={formatMoney(order.refunded_amount, currency)}
        />
        <DetailRow
          label="Additional Amount"
          value={formatMoney(order.additional_amount, currency)}
        />

        <DetailRow label="Payment Method" value={humanise(order.payment.method)} />
        <DetailRow label="Payment Status" value={humanise(order.payment.status)} />
        <DetailRow
          label="Transaction Id"
          value={order.payment.transaction_id ?? "Not defined"}
        />

        <DetailRow label="Order Date" value={formatDateTime(order.created_at)} />
        <DetailRow label="Commission" value={formatMoney(order.commission, currency)} />
        <DetailRow
          label="Vendor Earnings"
          value={formatMoney(order.vendor_earnings, currency)}
        />
      </dl>
    </Card>
  );
}

/** `cash_on_delivery` → `Cash On Delivery`. */
function humanise(value: string | null): string {
  if (!value) return "Not defined";
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}
