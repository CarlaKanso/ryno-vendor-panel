import { getAllOrders } from "@/lib/api/orders";
import { ApiError } from "@/lib/api/http";
import type { Order } from "@/lib/api/types";
import { formatDateTime } from "@/lib/dates";
import {
  buildWorkbook,
  downloadHeaders,
  MONEY_FORMAT,
  type Column,
} from "@/lib/export/workbook";
import {
  ARCHIVED_MODES,
  readDateKey,
  readEnum,
  readString,
  readStatuses,
  ORDER_SORTS,
  type SearchParams,
} from "@/lib/search-params";
import { statusLabel } from "@/lib/status";

/**
 * `GET /api/export/orders?<the same query string as /orders>`
 *
 * The export reads the *same* search params the list page reads, so whatever
 * is on screen is exactly what lands in the spreadsheet — every matching row,
 * not just the visible page. Running it as a Route Handler keeps the API key
 * on the server and lets the browser treat the response as a plain download.
 */

const COLUMNS: Array<Column<Order>> = [
  { header: "#", width: 6, value: (_row, index) => index + 1 },
  { header: "Order Id", width: 14, value: (row) => row.order_no },
  { header: "Order Code", width: 12, value: (row) => row.order_code ?? "" },
  { header: "User Name", width: 24, value: (row) => row.customer.full_name },
  { header: "User Email", width: 28, value: (row) => row.customer.email ?? "" },
  { header: "Shop Name", width: 26, value: (row) => row.shop.name },
  {
    header: "Driver Name",
    width: 22,
    value: (row) => row.driver?.full_name ?? "Not Assigned",
  },
  {
    header: "Total Amount",
    width: 15,
    value: (row) => row.subtotal,
    numFmt: MONEY_FORMAT,
  },
  {
    header: "Discount Amount",
    width: 16,
    value: (row) => row.discount,
    numFmt: MONEY_FORMAT,
  },
  {
    header: "Delivery Charge",
    width: 16,
    value: (row) => row.delivery_fee,
    numFmt: MONEY_FORMAT,
  },
  {
    header: "Gross Amount",
    width: 15,
    value: (row) => row.total,
    numFmt: MONEY_FORMAT,
  },
  {
    header: "Commission",
    width: 14,
    value: (row) => row.commission,
    numFmt: MONEY_FORMAT,
  },
  {
    header: "Vendor Earnings",
    width: 16,
    value: (row) => row.vendor_earnings,
    numFmt: MONEY_FORMAT,
  },
  {
    header: "Refunded Amount",
    width: 16,
    value: (row) => row.refunded_amount,
    numFmt: MONEY_FORMAT,
  },
  { header: "Order Status", width: 16, value: (row) => statusLabel(row.status) },
  { header: "Payment Method", width: 20, value: (row) => row.payment.method ?? "" },
  { header: "Promocode", width: 14, value: (row) => row.promo_code ?? "" },
  { header: "Items", width: 8, value: (row) => row.item_count },
  { header: "Order Date", width: 24, value: (row) => formatDateTime(row.created_at) },
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries()) as SearchParams;

  try {
    const orders = await getAllOrders({
      shopId: readString(params, "shop_id"),
      status: readStatuses(params),
      from: readDateKey(params, "from"),
      to: readDateKey(params, "to"),
      mainCategoryId: readString(params, "main_category_id"),
      categoryId: readString(params, "category_id"),
      subCategoryId: readString(params, "sub_category_id"),
      q: readString(params, "q"),
      archived: readEnum(params, "archived", ARCHIVED_MODES, "exclude"),
      sort: readEnum(params, "sort", ORDER_SORTS, "-created_at"),
    });

    const range = [readDateKey(params, "from"), readDateKey(params, "to")]
      .filter(Boolean)
      .join(" to ");

    const buffer = await buildWorkbook({
      sheetName: "Orders",
      title: "Kaya Market — Orders",
      subtitle: [
        `${orders.length} order${orders.length === 1 ? "" : "s"}`,
        range || "all dates",
        `exported ${formatDateTime(new Date().toISOString())}`,
      ].join(" · "),
      columns: COLUMNS,
      rows: orders,
    });

    return new Response(new Uint8Array(buffer), {
      headers: downloadHeaders("kaya-market-orders"),
    });
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "The export failed. Please try again.";
    return Response.json({ error: { message } }, { status: 502 });
  }
}
