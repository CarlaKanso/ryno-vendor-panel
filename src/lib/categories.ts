import type { Category } from "./api/types";

/**
 * Shaping for the product dialog's sub-category field.
 *
 * The API returns a flat list of 50 categories across three levels. Offering
 * the 30 leaves as one flat dropdown throws away the hierarchy that makes them
 * make sense — "Chairs" and "Wall Art" sit side by side with nothing to say
 * one is furniture and the other is decor.
 *
 * Grouping by *main* gives five groups of six, which is the readable size.
 * Grouping by the immediate parent instead would give fifteen groups of two,
 * which is barely different from a flat list. The middle level is not lost
 * though — it goes on the option itself, so a choice reads "Furniture ·
 * Chairs".
 */

export type SubCategoryOption = {
  id: string;
  /** e.g. `"Furniture · Chairs"` */
  label: string;
};

export type SubCategoryGroup = {
  id: string;
  /** e.g. `"Home & Living"` */
  label: string;
  options: SubCategoryOption[];
};

export function groupSubCategories(all: readonly Category[]): SubCategoryGroup[] {
  const byId = new Map(all.map((category) => [category.id, category]));

  const options = new Map<string, SubCategoryOption[]>();
  const labels = new Map<string, string>();
  const order = new Map<string, number>();

  for (const sub of all) {
    if (sub.level !== "sub" || !sub.parent_id) continue;

    const parent = byId.get(sub.parent_id);
    // A sub whose chain is broken still has to be selectable, so it falls back
    // to its own name under an "Other" group rather than disappearing.
    const main = parent?.parent_id ? byId.get(parent.parent_id) : undefined;
    const groupId = main?.id ?? "ungrouped";

    if (!options.has(groupId)) {
      options.set(groupId, []);
      labels.set(groupId, main?.name ?? "Other");
      order.set(groupId, main?.sort_order ?? Number.MAX_SAFE_INTEGER);
    }

    options.get(groupId)!.push({
      id: sub.id,
      label: parent ? `${parent.name} · ${sub.name}` : sub.name,
    });
  }

  return [...options.entries()]
    .map(([id, groupOptions]) => ({
      id,
      label: labels.get(id)!,
      options: groupOptions.sort((a, b) => a.label.localeCompare(b.label)),
    }))
    .sort(
      (a, b) => order.get(a.id)! - order.get(b.id)! || a.label.localeCompare(b.label),
    );
}

/** The first selectable option, used as the default for a new product. */
export function firstSubCategoryId(groups: readonly SubCategoryGroup[]): string {
  return groups[0]?.options[0]?.id ?? "";
}
