"use client";

import { ImageIcon, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

import { createItem, deleteItem, updateItem } from "@/actions/products";
import { Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Select, TextInput } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import type { Category, Item } from "@/lib/api/types";
import { formatMoney } from "@/lib/money";

/**
 * The values the product dialog hands back. `image` is a URL, not a file:
 * this API stores `image_url` and has no upload endpoint, so there is nowhere
 * to put bytes even if we collected them.
 */
type ProductFormValues = {
  name: string;
  price: number;
  sub_category_id: string;
  barcode: string;
  image: string;
  is_active: boolean;
};

/** `true` for an empty string or a well-formed http(s) URL. */
function isUsableImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const { protocol } = new URL(trimmed);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Products (bonus).
 *
 * A single client surface: list, search, create, edit and soft delete. The
 * server hands over the first page and the sub-category list; everything after
 * that is a Server Action whose response is written straight back into state.
 */
export function ProductsBoard({
  items: initialItems,
  subCategories,
  currency,
}: {
  items: Item[];
  subCategories: Category[];
  currency: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [pending, setPending] = useState(false);

  // Adopt a fresh server page when the route re-renders.
  const [seen, setSeen] = useState(initialItems);
  if (seen !== initialItems) {
    setSeen(initialItems);
    setItems(initialItems);
  }

  // The catalogue is 27 products, so filtering in the browser is instant and
  // costs no round trip. A bigger catalogue would push `q` into the URL and
  // let the API do it, the way the order list already does.
  const visible = items.filter((item) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return [item.name, item.sku, item.barcode]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(needle));
  });

  const save = async (input: ProductFormValues) => {
    if (pending) return;
    setPending(true);

    const payload = {
      name: input.name.trim(),
      price: input.price,
      sub_category_id: input.sub_category_id,
      barcode: input.barcode.trim() || null,
      image_url: input.image.trim() || null,
      is_active: input.is_active,
    };

    const result =
      editing === "new"
        ? await createItem(payload)
        : await updateItem((editing as Item).id, payload);

    setPending(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    setItems((current) =>
      editing === "new"
        ? [result.item, ...current]
        : current.map((item) => (item.id === result.item.id ? result.item : item)),
    );
    toast.success(editing === "new" ? "Product created" : "Product updated");
    setEditing(null);
  };

  const remove = async () => {
    if (!deleting || pending) return;
    setPending(true);
    const result = await deleteItem(deleting.id);
    setPending(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    // A soft delete, so the row stays and is marked inactive rather than
    // vanishing — it is still on historical orders.
    setItems((current) =>
      current.map((item) =>
        item.id === deleting.id ? { ...item, is_active: false } : item,
      ),
    );
    toast.success(`${deleting.name} discontinued`);
    setDeleting(null);
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
            aria-hidden
          />
          <TextInput
            type="search"
            className="pl-9"
            aria-label="Search products"
            placeholder="Search name, SKU or barcode"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <Button
          variant="primary"
          onClick={() => setEditing("new")}
          icon={<Plus className="size-4" aria-hidden />}
        >
          New product
        </Button>
      </div>

      <div className="overflow-hidden rounded-card border border-ink-200/80 bg-white shadow-card">
        {visible.length === 0 ? (
          <EmptyState
            title="No products match that search"
            description="Clear the search to see the whole catalogue."
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[720px] text-sm">
              <caption className="sr-only">Product catalogue</caption>
              <thead>
                <tr className="border-b border-ink-200 bg-ink-50/60 text-left text-xs uppercase tracking-wide text-ink-500">
                  <th scope="col" className="px-5 py-2.5 font-medium">
                    Product
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    SKU
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    Barcode
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">
                    Price
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="stagger">
                <AnimatePresence initial={false}>
                  {visible.map((item) => (
                    <motion.tr
                      key={item.id}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-b border-ink-100 transition-colors last:border-0 hover:bg-ryno-50/40"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-100 ring-1 ring-ink-200">
                            {item.image_url ? (
                              <Image
                                src={item.image_url}
                                alt=""
                                width={40}
                                height={40}
                                className="size-full object-cover"
                                unoptimized
                              />
                            ) : null}
                          </span>
                          <span className="truncate font-medium text-ink-900">
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-ink-600 tabular">
                        {item.sku ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-ink-600 tabular">
                        {item.barcode ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-ink-900 tabular">
                        {formatMoney(item.price, currency)}
                      </td>
                      <td className="px-3 py-3">
                        <Tag tone={item.is_active ? "green" : "neutral"}>
                          {item.is_active ? "Active" : "Discontinued"}
                        </Tag>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditing(item)}
                            icon={<Pencil className="size-3.5" aria-hidden />}
                          >
                            Edit
                          </Button>
                          {item.is_active ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={`Discontinue ${item.name}`}
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => setDeleting(item)}
                              icon={<Trash2 className="size-3.5" aria-hidden />}
                            />
                          ) : null}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProductDialog
        target={editing}
        subCategories={subCategories}
        onClose={() => setEditing(null)}
        onSave={save}
        saving={pending}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Discontinue this product?"
        description={`${deleting?.name ?? "This product"} stops appearing to customers. It stays on past orders, and you can re-activate it by editing it.`}
        confirmLabel="Discontinue"
        loading={pending}
        onConfirm={remove}
      />
    </>
  );
}

function ProductDialog({
  target,
  subCategories,
  onClose,
  onSave,
  saving,
}: {
  target: Item | "new" | null;
  subCategories: Category[];
  onClose: () => void;
  onSave: (input: ProductFormValues) => void;
  saving: boolean;
}) {
  const isNew = target === "new";
  const item = isNew || target === null ? null : target;

  const [form, setForm] = useState({
    name: "",
    price: "",
    sub_category_id: "",
    barcode: "",
    image: "",
    is_active: true,
  });
  const [imageBroken, setImageBroken] = useState(false);

  // Seed the form from whichever product is being edited, during render — the
  // dialog stays mounted between openings, so there is no remount to do it.
  const targetKey = target === null ? null : isNew ? "new" : (target as Item).id;
  const [lastTargetKey, setLastTargetKey] = useState(targetKey);
  if (lastTargetKey !== targetKey) {
    setLastTargetKey(targetKey);
    if (target !== null) {
      setForm({
        name: item?.name ?? "",
        price: item ? String(item.price) : "",
        sub_category_id: item?.sub_category_id ?? subCategories[0]?.id ?? "",
        barcode: item?.barcode ?? "",
        image: item?.image_url ?? "",
        is_active: item?.is_active ?? true,
      });
      setImageBroken(false);
    }
  }

  const price = Number(form.price);
  const imageUrlOk = isUsableImageUrl(form.image);
  const valid =
    form.name.trim().length > 0 &&
    Number.isFinite(price) &&
    price >= 0 &&
    form.sub_category_id.length > 0 &&
    imageUrlOk;

  return (
    <Modal
      open={target !== null}
      onClose={saving ? () => {} : onClose}
      title={isNew ? "New product" : "Edit product"}
      description="Products are shared across all your branches."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={saving}
            disabled={!valid}
            onClick={() =>
              onSave({
                name: form.name,
                price,
                sub_category_id: form.sub_category_id,
                barcode: form.barcode,
                image: form.image,
                is_active: form.is_active,
              })
            }
          >
            {isNew ? "Create product" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Name" htmlFor="product-name">
          <TextInput
            id="product-name"
            value={form.name}
            maxLength={120}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </Field>

        <div className="flex gap-3">
          <Field label="Price (GHS)" htmlFor="product-price">
            <TextInput
              id="product-price"
              type="number"
              min={0}
              step="0.01"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
            />
          </Field>

          <Field label="Barcode" htmlFor="product-barcode">
            <TextInput
              id="product-barcode"
              value={form.barcode}
              onChange={(event) => setForm({ ...form, barcode: event.target.value })}
            />
          </Field>
        </div>

        <Field label="Sub category" htmlFor="product-category">
          <Select
            id="product-category"
            value={form.sub_category_id}
            onChange={(event) =>
              setForm({ ...form, sub_category_id: event.target.value })
            }
          >
            {subCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>

        {/* A link, not an upload: the API stores `image_url` and offers no
            endpoint to put bytes anywhere. The preview is the useful half —
            it tells you the URL resolves before you save it. */}
        <Field
          label="Image URL"
          htmlFor="product-image"
          hint={
            imageUrlOk
              ? "Optional. Paste a link to a product photo."
              : "That doesn't look like a web address — it should start with http:// or https://"
          }
        >
          <div className="flex items-start gap-3">
            <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-100 ring-1 ring-ink-200">
              {form.image.trim() && imageUrlOk && !imageBroken ? (
                /* The host here is whatever the vendor pasted, so `next/image`
                   cannot be told to allow it in advance — a plain <img> is the
                   only thing that works for an arbitrary URL. */
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.image.trim()}
                  alt=""
                  className="size-full object-cover"
                  onError={() => setImageBroken(true)}
                  onLoad={() => setImageBroken(false)}
                />
              ) : (
                <ImageIcon className="size-5 text-ink-400" aria-hidden />
              )}
            </span>
            <TextInput
              id="product-image"
              type="url"
              inputMode="url"
              placeholder="https://example.com/photo.jpg"
              value={form.image}
              aria-invalid={!imageUrlOk}
              onChange={(event) => {
                setImageBroken(false);
                setForm({ ...form, image: event.target.value });
              }}
            />
          </div>
        </Field>

        {form.image.trim() && imageUrlOk && imageBroken ? (
          <p className="text-xs text-red-600">
            That link didn&apos;t load. You can still save it, but the product
            will show a blank thumbnail.
          </p>
        ) : null}

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-700">
          <input
            type="checkbox"
            className="size-4 rounded border-ink-300 text-ryno-600 focus:ring-ryno-600/30"
            checked={form.is_active}
            onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
          />
          Active — customers can order this
        </label>
      </div>
    </Modal>
  );
}
