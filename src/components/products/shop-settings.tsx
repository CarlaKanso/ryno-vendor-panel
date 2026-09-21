"use client";

import { Check, MapPin, Phone, Store } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

import { updateShop } from "@/actions/products";
import { riseIn, staggerContainer } from "@/components/motion/variants";
import { Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextInput, TextareaInput } from "@/components/ui/field";
import type { Shop } from "@/lib/api/types";
import { formatDate } from "@/lib/dates";

/**
 * Bonus: shop settings.
 *
 * Each branch is its own small form, and only the fields the API accepts are
 * editable. A form is saved on its own, so a mistake in one branch cannot lose
 * an edit to another.
 */
export function ShopSettings({ shops }: { shops: Shop[] }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="grid gap-4 xl:grid-cols-2"
    >
      {shops.map((shop) => (
        <motion.div key={shop.id} variants={riseIn}>
          <ShopCard shop={shop} />
        </motion.div>
      ))}
    </motion.div>
  );
}

function ShopCard({ shop: initialShop }: { shop: Shop }) {
  const [shop, setShop] = useState(initialShop);
  const [form, setForm] = useState({
    about: initialShop.about ?? "",
    phone: initialShop.phone ?? "",
    address: initialShop.address ?? "",
    is_active: initialShop.is_active,
  });
  const [saving, setSaving] = useState(false);

  const dirty =
    form.about !== (shop.about ?? "") ||
    form.phone !== (shop.phone ?? "") ||
    form.address !== (shop.address ?? "") ||
    form.is_active !== shop.is_active;

  const save = async () => {
    if (saving) return;
    setSaving(true);

    const result = await updateShop(shop.id, {
      about: form.about.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      is_active: form.is_active,
    });

    setSaving(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    setShop(result.shop);
    setForm({
      about: result.shop.about ?? "",
      phone: result.shop.phone ?? "",
      address: result.shop.address ?? "",
      is_active: result.shop.is_active,
    });
    toast.success(`${result.shop.name} updated`);
  };

  return (
    <Card className="flex h-full flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-200/70 px-5 py-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ink-900">
            <Store className="size-4 shrink-0 text-ryno-600" aria-hidden />
            <span className="truncate">{shop.name}</span>
          </h2>
          <p className="mt-0.5 text-sm text-ink-500">
            Opened {formatDate(shop.opened_at)}
            {shop.closed_at ? ` · closed ${formatDate(shop.closed_at)}` : ""}
          </p>
        </div>
        <Tag tone={shop.is_active ? "green" : "neutral"}>
          {shop.is_active ? "Open" : "Closed"}
        </Tag>
      </div>

      <form
        className="flex flex-1 flex-col gap-3 px-5 py-4"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <Field label="Phone" htmlFor={`phone-${shop.id}`}>
          <div className="relative">
            <Phone
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
              aria-hidden
            />
            <TextInput
              id={`phone-${shop.id}`}
              className="pl-9"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </div>
        </Field>

        <Field label="Address" htmlFor={`address-${shop.id}`}>
          <div className="relative">
            <MapPin
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
              aria-hidden
            />
            <TextInput
              id={`address-${shop.id}`}
              className="pl-9"
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
            />
          </div>
        </Field>

        <Field label="About" htmlFor={`about-${shop.id}`}>
          <TextareaInput
            id={`about-${shop.id}`}
            value={form.about}
            maxLength={600}
            onChange={(event) => setForm({ ...form, about: event.target.value })}
          />
        </Field>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-700">
          <input
            type="checkbox"
            className="size-4 rounded border-ink-300 text-ryno-600 focus:ring-ryno-600/30"
            checked={form.is_active}
            onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
          />
          Open for orders
        </label>

        <div className="mt-auto flex items-center justify-end gap-2 pt-2">
          {!dirty && !saving ? (
            <span className="flex items-center gap-1.5 text-xs text-ink-400">
              <Check className="size-3.5" aria-hidden />
              Saved
            </span>
          ) : null}
          <Button type="submit" variant="primary" loading={saving} disabled={!dirty}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}
