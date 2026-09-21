import { ApiError } from "@/lib/api/http";
import { getAllReviews } from "@/lib/api/reviews";
import type { Review } from "@/lib/api/types";
import { formatDateTime } from "@/lib/dates";
import { buildWorkbook, downloadHeaders, type Column } from "@/lib/export/workbook";
import {
  readDateKey,
  readEnum,
  readInt,
  readString,
  REVIEW_SORTS,
  type SearchParams,
} from "@/lib/search-params";

/** `GET /api/export/reviews?<the same query string as /reviews>`. */

const COLUMNS: Array<Column<Review>> = [
  { header: "#", width: 6, value: (_row, index) => index + 1 },
  { header: "Customer Name", width: 26, value: (row) => row.customer.full_name },
  { header: "Order Id", width: 14, value: (row) => row.order_no },
  { header: "Shop Name", width: 26, value: (row) => row.shop.name },
  { header: "Shop Rating", width: 12, value: (row) => row.rating },
  { header: "Shop Review", width: 52, value: (row) => row.comment ?? "" },
  { header: "Vendor Reply", width: 52, value: (row) => row.vendor_reply ?? "" },
  {
    header: "Replied At",
    width: 24,
    value: (row) => (row.replied_at ? formatDateTime(row.replied_at) : ""),
  },
  { header: "Created Date", width: 24, value: (row) => formatDateTime(row.created_at) },
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries()) as SearchParams;

  const ratingParam = readString(params, "rating");
  const hasReplyParam = readString(params, "has_reply");

  try {
    const reviews = await getAllReviews({
      shopId: readString(params, "shop_id"),
      rating: ratingParam ? readInt(params, "rating", 0, { min: 1, max: 5 }) : undefined,
      hasReply:
        hasReplyParam === "true" ? true : hasReplyParam === "false" ? false : undefined,
      q: readString(params, "q"),
      from: readDateKey(params, "from"),
      to: readDateKey(params, "to"),
      sort: readEnum(params, "sort", REVIEW_SORTS, "-created_at"),
    });

    const buffer = await buildWorkbook({
      sheetName: "Reviews",
      title: "Kaya Market — Reviews & Ratings",
      subtitle: [
        `${reviews.length} review${reviews.length === 1 ? "" : "s"}`,
        `exported ${formatDateTime(new Date().toISOString())}`,
      ].join(" · "),
      columns: COLUMNS,
      rows: reviews,
    });

    return new Response(new Uint8Array(buffer), {
      headers: downloadHeaders("kaya-market-reviews"),
    });
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "The export failed. Please try again.";
    return Response.json({ error: { message } }, { status: 502 });
  }
}
