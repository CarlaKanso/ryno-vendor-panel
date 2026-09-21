"use server";

import { ApiError } from "@/lib/api/http";
import { getItems } from "@/lib/api/items";
import type { Item } from "@/lib/api/types";

/**
 * Item search for the "add a substitute" picker.
 *
 * A Server Action rather than a Route Handler because the only caller is a
 * dialog in this app, and an action keeps the API key on the server without
 * adding a public endpoint that would need its own input validation.
 */
export async function searchItems(
  query: string,
): Promise<{ ok: true; items: Item[] } | { ok: false; message: string }> {
  try {
    const result = await getItems({
      q: query.trim() || undefined,
      isActive: true,
      perPage: 20,
    });
    return { ok: true, items: result.data };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ApiError
          ? error.message
          : "Could not search products. Please try again.",
    };
  }
}
