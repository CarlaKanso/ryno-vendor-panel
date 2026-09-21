"use server";

import { updateTag } from "next/cache";

import { ApiError, apiFetch } from "@/lib/api/http";
import { CACHE_TAGS } from "@/lib/api/tags";
import type { Envelope, Item, Shop } from "@/lib/api/types";

/**
 * The bonus surfaces: the product catalogue and shop settings.
 *
 * Same contract as the order actions — return a result, never throw, and pass
 * the API's own message through so the UI can show it verbatim.
 */

export type ItemResult =
  | { ok: true; item: Item }
  | { ok: false; message: string };

export type ShopResult =
  | { ok: true; shop: Shop }
  | { ok: false; message: string };

function message(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "Something went wrong. Please try again.";
}

export type ItemInput = {
  name: string;
  price: number;
  sub_category_id: string;
  barcode?: string | null;
  image_url?: string | null;
  is_active?: boolean;
};

export async function createItem(input: ItemInput): Promise<ItemResult> {
  try {
    const response = await apiFetch<Envelope<Item>>("/v1/items", {
      method: "POST",
      body: input,
    });
    updateTag(CACHE_TAGS.items);
    return { ok: true, item: response.data };
  } catch (error) {
    return { ok: false, message: message(error) };
  }
}

export async function updateItem(
  itemId: string,
  input: Partial<ItemInput>,
): Promise<ItemResult> {
  try {
    const response = await apiFetch<Envelope<Item>>(
      `/v1/items/${encodeURIComponent(itemId)}`,
      { method: "PATCH", body: input },
    );
    updateTag(CACHE_TAGS.items);
    return { ok: true, item: response.data };
  } catch (error) {
    return { ok: false, message: message(error) };
  }
}

/** A soft delete: the product stays on historical orders. */
export async function deleteItem(
  itemId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await apiFetch(`/v1/items/${encodeURIComponent(itemId)}`, { method: "DELETE" });
    updateTag(CACHE_TAGS.items);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: message(error) };
  }
}

export type ShopInput = {
  about?: string | null;
  phone?: string | null;
  address?: string | null;
  is_active?: boolean;
};

export async function updateShop(
  shopId: string,
  input: ShopInput,
): Promise<ShopResult> {
  try {
    const response = await apiFetch<Envelope<Shop>>(
      `/v1/shops/${encodeURIComponent(shopId)}`,
      { method: "PATCH", body: input },
    );
    updateTag(CACHE_TAGS.shops);
    return { ok: true, shop: response.data };
  } catch (error) {
    return { ok: false, message: message(error) };
  }
}
