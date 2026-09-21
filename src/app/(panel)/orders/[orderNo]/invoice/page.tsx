import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PrintButton } from "@/components/order-detail/print-button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/http";
import { getOrder } from "@/lib/api/orders";
import { formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { statusLabel } from "@/lib/status";

export async function generateMetadata({
  params,
}: PageProps<"/orders/[orderNo]/invoice">) {
  const { orderNo } = await params;
  return { title: `Invoice #${orderNo}` };
}

/**
 * A printable invoice.
 *
 * A print-styled page rather than a generated PDF: the browser's own print
 * dialog gives "Save as PDF" for free on every platform, the layout stays
 * selectable and searchable, and there is no PDF library to keep alive. The
 * `@media print` rules in `globals.css` drop the panel chrome and set A4.
 */
export default function InvoicePage({ params }: PageProps<"/orders/[orderNo]/invoice">) {
  return (
    <Suspense
      fallback={<Skeleton className="mx-auto h-[900px] w-full max-w-3xl rounded-card" />}
    >
      <Invoice params={params} />
    </Suspense>
  );
}

async function Invoice({
  params,
}: {
  params: PageProps<"/orders/[orderNo]/invoice">["params"];
}) {
  const { orderNo } = await params;

  let order;
  try {
    order = await getOrder(orderNo);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  const currency = order.currency ?? "GHS";
  const availableItems = order.items.filter((item) => item.status === "available");
  const unavailableItems = order.items.filter((item) => item.status !== "available");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <Link
          href={`/orders/${order.order_no}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 transition-colors hover:text-ryno-700"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to order
        </Link>
        <PrintButton />
      </div>

      <article className="rounded-card border border-ink-200 bg-white p-8 shadow-card print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-ink-200 pb-6">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/ryno-icon.png"
              alt=""
              width={48}
              height={48}
              className="rounded-lg"
            />
            <div>
              <p className="font-display text-2xl leading-none tracking-wide text-ryno-700">
                RYNO
              </p>
              <p className="mt-1 text-sm text-ink-500">Delivery marketplace · Accra</p>
            </div>
          </div>

          <div className="text-right">
            <h1 className="text-xl font-bold tracking-tight text-ink-900">Invoice</h1>
            <p className="mt-1 text-sm text-ink-600 tabular">#{order.order_no}</p>
            <p className="text-sm text-ink-500">{formatDateTime(order.created_at)}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-500">
              {statusLabel(order.status)}
            </p>
          </div>
        </header>

        <section className="grid gap-6 border-b border-ink-200 py-6 sm:grid-cols-3">
          <InvoiceBlock title="Billed to">
            <p className="font-medium text-ink-900">{order.customer.full_name}</p>
            {order.customer.email ? <p>{order.customer.email}</p> : null}
            {order.customer.phone ? <p>{order.customer.phone}</p> : null}
            <p className="mt-1">{order.delivery_address ?? "Address not defined"}</p>
          </InvoiceBlock>

          <InvoiceBlock title="Fulfilled by">
            <p className="font-medium text-ink-900">{order.shop.name}</p>
            {order.shop.address ? <p>{order.shop.address}</p> : null}
            {order.shop.phone ? <p>{order.shop.phone}</p> : null}
          </InvoiceBlock>

          <InvoiceBlock title="Vendor">
            <p className="font-medium text-ink-900">{order.vendor.name}</p>
            {order.vendor.email ? <p>{order.vendor.email}</p> : null}
            {order.vendor.phone ? <p>{order.vendor.phone}</p> : null}
            {order.order_code ? <p className="mt-1">Code {order.order_code}</p> : null}
          </InvoiceBlock>
        </section>

        <section className="py-6">
          <table className="w-full text-sm">
            <caption className="sr-only">Items invoiced on order {order.order_no}</caption>
            <thead>
              <tr className="border-b border-ink-300 text-left text-xs uppercase tracking-wide text-ink-500">
                <th scope="col" className="pb-2 font-medium">
                  Item
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  Qty
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  Unit price
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {availableItems.map((item) => (
                <tr key={item.id} className="border-b border-ink-100">
                  <td className="py-2.5 pr-3">
                    <span className="font-medium text-ink-900">{item.name}</span>
                    {item.is_additional ? (
                      <span className="ml-2 text-xs text-ink-500">(substitute)</span>
                    ) : null}
                    {item.barcode ? (
                      <span className="block text-xs text-ink-400 tabular">
                        {item.barcode}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2.5 text-right text-ink-700 tabular">
                    {item.quantity}
                  </td>
                  <td className="py-2.5 text-right text-ink-700 tabular">
                    {formatMoney(item.unit_price, currency)}
                  </td>
                  <td className="py-2.5 text-right font-medium text-ink-900 tabular">
                    {formatMoney(item.line_total, currency)}
                  </td>
                </tr>
              ))}

              {/* Unavailable lines are listed but not charged, so the customer
                  can see what was dropped rather than wonder why the total
                  moved. */}
              {unavailableItems.map((item) => (
                <tr key={item.id} className="border-b border-ink-100 text-ink-400">
                  <td className="py-2.5 pr-3">
                    <span className="line-through">{item.name}</span>
                    <span className="ml-2 text-xs">(not available — not charged)</span>
                  </td>
                  <td className="py-2.5 text-right tabular">{item.quantity}</td>
                  <td className="py-2.5 text-right tabular">
                    {formatMoney(item.unit_price, currency)}
                  </td>
                  <td className="py-2.5 text-right tabular">—</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 flex justify-end">
            <dl className="w-full max-w-xs space-y-2 text-sm">
              <TotalRow label="Total Amount" value={formatMoney(order.subtotal, currency)} />
              <TotalRow
                label="Discount"
                value={`− ${formatMoney(order.discount, currency)}`}
              />
              <TotalRow
                label="Delivery charge"
                value={formatMoney(order.delivery_fee, currency)}
              />
              {order.refunded_amount > 0 ? (
                <TotalRow
                  label="Refunded"
                  value={formatMoney(order.refunded_amount, currency)}
                />
              ) : null}
              <div className="flex items-baseline justify-between border-t border-ink-300 pt-2">
                <dt className="font-semibold text-ink-900">Gross Amount</dt>
                <dd className="text-lg font-bold text-ryno-700 tabular">
                  {formatMoney(order.total, currency)}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <footer className="border-t border-ink-200 pt-4 text-xs text-ink-500">
          <p>
            Payment: {order.payment.method?.replace(/_/g, " ") ?? "not recorded"} ·{" "}
            {order.payment.status ?? "unknown"}
            {order.payment.transaction_id
              ? ` · txn ${order.payment.transaction_id}`
              : ""}
          </p>
          {order.promo_code ? <p className="mt-1">Promo code: {order.promo_code}</p> : null}
          {order.instruction ? (
            <p className="mt-1">Delivery note: {order.instruction}</p>
          ) : null}
          <p className="mt-2">
            All amounts in Ghana cedi (GHS). Generated from the RYNO Vendor Panel.
          </p>
        </footer>
      </article>
    </div>
  );
}

function InvoiceBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="text-sm text-ink-600">
      <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
        {title}
      </h2>
      {children}
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-600">{label}</dt>
      <dd className="font-medium text-ink-900 tabular">{value}</dd>
    </div>
  );
}
