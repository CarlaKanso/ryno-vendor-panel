/**
 * Response shapes of the Vendor Panel API.
 *
 * Hand-written from the OpenAPI spec rather than generated: the surface is
 * small, and writing it by hand let me encode the bits the spec leaves loose
 * (the status union, the event-type union) as real unions the UI can switch on.
 */

export type Paginated<T> = {
  data: T[];
  meta: { page: number; per_page: number; total: number; total_pages: number };
};

export type Envelope<T> = { data: T };

export const ORDER_STATUSES = [
  "pending",
  "accepted",
  "ready_for_pickup",
  "on_the_way",
  "completed",
  "cancelled",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const TIMELINE_EVENT_TYPES = [
  "ordered",
  "waiting_for_confirmation",
  "accepted_by_picker",
  "accepted_by_driver",
  "ready_to_pickup",
  "picked_up_by_driver",
  "completed",
  "cancelled",
  "refunded",
] as const;

export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

export type ActivityEventType =
  | "driver_unassigned"
  | "item_unavailable"
  | "item_available"
  | "item_added"
  | "item_removed"
  | "archived"
  | "restored";

export type OrderEvent = {
  type: TimelineEventType | ActivityEventType | (string & {});
  note: string | null;
  created_at: string;
};

export type Vendor = {
  id: string;
  name: string;
  about: string | null;
  email: string | null;
  phone: string | null;
  currency: string;
  logo_url: string | null;
  timezone: string;
  commission_rate: number;
};

export type Shop = {
  id: string;
  name: string;
  area: string | null;
  city: string | null;
  about: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  opened_at: string | null;
  closed_at: string | null;
};

export type CategoryLevel = "main" | "category" | "sub";

export type Category = {
  id: string;
  name: string;
  slug: string;
  level: CategoryLevel;
  parent_id: string | null;
  sort_order: number;
};

export type Person = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  is_active?: boolean;
};

/** The trimmed-down person the list endpoint embeds in each order. */
export type PersonRef = Pick<Person, "id" | "full_name"> &
  Partial<Pick<Person, "email" | "phone" | "avatar_url">>;

export type ShopRef = Pick<Shop, "id" | "name"> & Partial<Pick<Shop, "area">>;

export type Payment = {
  method: string | null;
  status: string | null;
  provider: string | null;
  transaction_id: string | null;
};

export type OrderItem = {
  id: string;
  item_id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  image_url: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  status: "available" | "not_available";
  is_additional: boolean;
  main_category_id: string | null;
  category_id: string | null;
  sub_category_id: string | null;
};

/** An order as returned by `GET /v1/orders`. */
export type Order = {
  id: string;
  order_no: string;
  order_code: string | null;
  status: OrderStatus;
  currency: string;
  shop: ShopRef;
  customer: PersonRef;
  driver: PersonRef | null;
  payment: Payment;

  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  commission: number;
  vendor_earnings: number;
  refunded_amount: number;
  additional_amount: number;

  item_count: number;
  promo_code: string | null;
  cancel_reason: string | null;
  refund_reason: string | null;

  created_at: string;
  updated_at: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;
  archived_at: string | null;

  /** Only present when the list is requested with `include=items`. */
  items?: OrderItem[];
};

export type ReviewRef = {
  id: string;
  rating: number;
  comment: string | null;
  vendor_reply: string | null;
  replied_at: string | null;
  created_at: string;
};

/** An order as returned by `GET /v1/orders/{order_no}` — the full record. */
export type OrderDetail = Order & {
  items: OrderItem[];
  events: OrderEvent[];
  shop: Shop;
  customer: Person;
  driver: Person | null;
  picker: Person | null;
  vendor: Pick<Vendor, "id" | "name" | "email" | "phone" | "logo_url">;
  review: ReviewRef | null;
  instruction: string | null;
  delivery_address: string | null;
  shipping_address: string | null;
  allowed_transitions: OrderStatus[];
};

export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  vendor_reply: string | null;
  replied_at: string | null;
  created_at: string;
  order_id: string;
  order_no: string;
  shop: ShopRef;
  customer: PersonRef;
};

export type Item = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  main_category_id: string | null;
  category_id: string | null;
  sub_category_id: string | null;
};

export type ApiErrorBody = {
  error: { code: string; message: string };
};
