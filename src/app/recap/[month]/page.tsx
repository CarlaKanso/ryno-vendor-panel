import { notFound } from "next/navigation";
import { Suspense } from "react";

import { RecapDeck, type RecapSlide } from "@/components/recap/recap-deck";
import {
  BestSellerSlide,
  BranchSlide,
  CoverSlide,
  CustomersSlide,
  EmptyMonthSlide,
  FixSlide,
  RushSlide,
  SignOffSlide,
  VolumeSlide,
} from "@/components/recap/slides";
import { filterOrders } from "@/lib/analytics";
import { getDashboardSnapshot } from "@/lib/api/orders";
import { getAllReviews } from "@/lib/api/reviews";
import { getVendor } from "@/lib/api/vendor";
import {
  formatMonth,
  isMonthKey,
  lastCompleteMonth,
  monthRange,
  shiftMonth,
  toDateKey,
} from "@/lib/dates";
import { buildRecap } from "@/lib/recap";

export async function generateMetadata({ params }: PageProps<"/recap/[month]">) {
  const { month } = await params;
  return { title: isMonthKey(month) ? `${formatMonth(month)} recap` : "Recap" };
}

/**
 * The monthly recap: one month of the vendor's data told as a short story.
 *
 * Outside the `(panel)` route group on purpose — it is full-screen, with no
 * sidebar and no filters, because it is something you *watch* rather than
 * something you work in. It reads the same cached snapshot the dashboard
 * does, so the whole deck costs one reviews request on top of what is already
 * in memory.
 */
export default function RecapPage({ params }: PageProps<"/recap/[month]">) {
  return (
    <Suspense fallback={<RecapLoading />}>
      <RecapScreen params={params} />
    </Suspense>
  );
}

function RecapLoading() {
  return (
    <div className="grid h-dvh place-items-center bg-ryno-900">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/50">
        Putting your month together…
      </p>
    </div>
  );
}

async function RecapScreen({ params }: { params: PageProps<"/recap/[month]">["params"] }) {
  const { month } = await params;
  if (!isMonthKey(month)) notFound();

  const today = toDateKey(new Date());
  // A month that has not started yet has nothing to recap.
  if (month > today.slice(0, 7)) notFound();

  const range = monthRange(month);
  const previousMonth = shiftMonth(month, -1);
  const previousRange = monthRange(previousMonth);

  const [snapshot, vendor, reviews] = await Promise.all([
    getDashboardSnapshot(),
    getVendor(),
    getAllReviews({ from: range.from, to: range.to }),
  ]);

  const recap = buildRecap({
    month,
    today,
    orders: filterOrders(snapshot, { from: range.from, to: range.to }),
    previousOrders: filterOrders(snapshot, {
      from: previousRange.from,
      to: previousRange.to,
    }),
    reviews,
    vendorName: vendor.name,
    currency: vendor.currency,
  });

  // The "next" link only exists once that month is complete, or it would
  // hand the vendor a recap that is still being written.
  const nextMonth = shiftMonth(month, 1);
  const nextAvailable = nextMonth <= lastCompleteMonth(today);

  const signOff: RecapSlide = {
    label: "Sign-off",
    tone: "green",
    content: (
      <SignOffSlide
        recap={recap}
        previousHref={`/recap/${previousMonth}`}
        nextHref={nextAvailable ? `/recap/${nextMonth}` : null}
        nextLabel={nextAvailable ? formatMonth(nextMonth) : null}
      />
    ),
  };

  if (recap.kpis.totalOrders === 0) {
    return (
      <RecapDeck
        title={`${recap.label} recap`}
        slides={[
          { label: "Cover", tone: "green", content: <EmptyMonthSlide recap={recap} /> },
          signOff,
        ]}
      />
    );
  }

  const slides: RecapSlide[] = [
    { label: "Cover", tone: "green", content: <CoverSlide recap={recap} /> },
    { label: "Orders", tone: "gold", content: <VolumeSlide recap={recap} /> },
    { label: "Your rush", tone: "green", content: <RushSlide recap={recap} /> },
  ];
  if (recap.items.length > 0) {
    slides.push({ label: "Best seller", tone: "light", content: <BestSellerSlide recap={recap} /> });
  }
  if (recap.shops.length > 0) {
    slides.push({ label: "Star branch", tone: "green", content: <BranchSlide recap={recap} /> });
  }
  if (recap.reviews.count > 0) {
    slides.push({ label: "Customers", tone: "gold", content: <CustomersSlide recap={recap} /> });
  }
  slides.push({ label: "One thing to fix", tone: "light", content: <FixSlide recap={recap} /> });
  slides.push(signOff);

  return <RecapDeck title={`${recap.label} recap`} slides={slides} />;
}
