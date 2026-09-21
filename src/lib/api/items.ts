import "server-only";

import { apiFetch, type QueryValue } from "./http";
import type { Envelope, Item, Paginated } from "./types";

export type ItemListQuery = {
  page?: number;
  perPage?: number;
  q?: string;
  isActive?: boolean;
  mainCategoryId?: string;
  categoryId?: string;
  subCategoryId?: string;
};

function toApiQuery(query: ItemListQuery): Record<string, QueryValue> {
  return {
    page: query.page,
    per_page: query.perPage,
    q: query.q,
    is_active: query.isActive,
    main_category_id: query.mainCategoryId,
    category_id: query.categoryId,
    sub_category_id: query.subCategoryId,
  };
}

export async function getItems(query: ItemListQuery): Promise<Paginated<Item>> {
  return apiFetch<Paginated<Item>>("/v1/items", { query: toApiQuery(query) });
}

export async function getItem(itemId: string): Promise<Item> {
  const response = await apiFetch<Envelope<Item>>(`/v1/items/${encodeURIComponent(itemId)}`);
  return response.data;
}
