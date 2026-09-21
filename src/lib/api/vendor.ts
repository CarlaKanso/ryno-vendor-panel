import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { apiFetch } from "./http";
import { CACHE_TAGS } from "./tags";
import type { Category, Envelope, Person, Shop, Vendor } from "./types";

/**
 * Reference data: the vendor profile, its branches, the category tree and the
 * driver roster. All of it is small, changes rarely, and is read on nearly
 * every page — so it is cached with a generous lifetime and a tag, and the
 * shop-settings action busts the tag when a branch changes.
 */

export async function getVendor(): Promise<Vendor> {
  "use cache";
  cacheTag(CACHE_TAGS.vendor);
  cacheLife("hours");

  const response = await apiFetch<Envelope<Vendor>>("/v1/vendor");
  return response.data;
}

export async function getShops(): Promise<Shop[]> {
  "use cache";
  cacheTag(CACHE_TAGS.shops);
  cacheLife("hours");

  const response = await apiFetch<Envelope<Shop[]>>("/v1/shops");
  return [...response.data].sort((a, b) => a.name.localeCompare(b.name));
}

export type CategoryTree = {
  all: Category[];
  main: Category[];
  byParent: Record<string, Category[]>;
  byId: Record<string, Category>;
};

/**
 * The API returns a flat list with `parent_id`; the three linked dropdowns
 * want it indexed by parent, so the shaping happens once here rather than in
 * every component that renders a level of it.
 */
export async function getCategoryTree(): Promise<CategoryTree> {
  "use cache";
  cacheTag(CACHE_TAGS.categories);
  cacheLife("hours");

  const response = await apiFetch<Envelope<Category[]>>("/v1/categories");
  const all = [...response.data].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
  );

  const byParent: Record<string, Category[]> = {};
  const byId: Record<string, Category> = {};
  for (const category of all) {
    byId[category.id] = category;
    if (category.parent_id) {
      (byParent[category.parent_id] ??= []).push(category);
    }
  }

  return { all, main: all.filter((c) => c.level === "main"), byParent, byId };
}

export async function getDrivers(): Promise<Person[]> {
  "use cache";
  cacheTag(CACHE_TAGS.drivers);
  cacheLife("hours");

  const response = await apiFetch<Envelope<Person[]>>("/v1/drivers");
  return [...response.data].sort((a, b) => a.full_name.localeCompare(b.full_name));
}
