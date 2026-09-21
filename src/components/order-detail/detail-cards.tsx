import {
  Bike,
  Building2,
  MapPin,
  Store,
  User,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { OrderDetail, Person } from "@/lib/api/types";

/**
 * Order Basic Details and the people cards.
 *
 * Empty values render as an em dash rather than a blank, so a card never
 * looks like it failed to load when the field is genuinely unset. Driver and
 * Picker get a real empty state, because "no driver yet" is a state the vendor
 * acts on.
 */

export function DetailRow({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-ink-900">
        {value ?? "—"}
      </dd>
    </div>
  );
}

function PersonCard({
  title,
  icon: Icon,
  person,
  emptyLabel,
}: {
  title: string;
  icon: LucideIcon;
  person: Person | null;
  emptyLabel: string;
}) {
  return (
    <Card className="p-5">
      <h3 className="mb-4 flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ink-900">
        <Icon className="size-4 text-ryno-600" aria-hidden />
        {title}
      </h3>

      {person ? (
        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailRow label="Name" value={person.full_name} />
          <DetailRow label="Email" value={person.email ?? "—"} />
          <DetailRow label="Phone" value={person.phone ?? "—"} />
          <DetailRow label="Address" value={person.address ?? "Not defined"} />
        </dl>
      ) : (
        <div className="rounded-lg border border-dashed border-ink-300 bg-ink-50/60 px-4 py-6 text-center">
          <p className="text-sm text-ink-500">{emptyLabel}</p>
        </div>
      )}
    </Card>
  );
}

export function OrderPeopleCards({ order }: { order: OrderDetail }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-4 flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ink-900">
          <Store className="size-4 text-ryno-600" aria-hidden />
          Shop Details
        </h3>
        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailRow label="Shop Name" value={order.shop.name} />
          <DetailRow
            label="Area"
            value={[order.shop.area, order.shop.city].filter(Boolean).join(", ") || "—"}
          />
          <DetailRow label="Phone" value={order.shop.phone ?? "—"} />
          <DetailRow
            label="Address"
            value={
              <span className="inline-flex items-start gap-1.5">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-ink-400" aria-hidden />
                {order.shop.address ?? "Not defined"}
              </span>
            }
          />
          <DetailRow
            label="About"
            value={<span className="font-normal text-ink-600">{order.shop.about ?? "—"}</span>}
            className="sm:col-span-2"
          />
        </dl>
      </Card>

      <PersonCard
        title="Driver Details"
        icon={Bike}
        person={order.driver}
        emptyLabel="No driver assigned yet."
      />

      <PersonCard
        title="Customer Details"
        icon={User}
        person={order.customer}
        emptyLabel="No customer on this order."
      />

      <PersonCard
        title="Picker Details"
        icon={UserRound}
        person={order.picker}
        emptyLabel="No picker assigned yet. One is assigned when you accept the order."
      />

      <Card className="p-5 lg:col-span-2">
        <h3 className="mb-4 flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ink-900">
          <Building2 className="size-4 text-ryno-600" aria-hidden />
          Vendor Details
        </h3>
        <dl className="grid gap-4 sm:grid-cols-3">
          <DetailRow label="Vendor Name" value={order.vendor.name} />
          <DetailRow label="Email" value={order.vendor.email ?? "—"} />
          <DetailRow label="Phone" value={order.vendor.phone ?? "—"} />
        </dl>
      </Card>
    </div>
  );
}
