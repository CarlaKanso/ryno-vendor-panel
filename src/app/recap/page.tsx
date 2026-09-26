import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { lastCompleteMonth, toDateKey } from "@/lib/dates";

/**
 * `/recap` is a door, not a page: it sends you to the last complete month.
 *
 * Which month that is depends on today, and today is a request-time value.
 * Under Cache Components anything read at request time has to live behind a
 * Suspense boundary — the same rule every dashboard section follows — so the
 * redirect happens inside one. `connection()` is what tells Next not to
 * prerender past that point and bake a month into the build.
 */
export default function RecapIndexPage() {
  return (
    <Suspense
      fallback={
        <div className="grid h-dvh place-items-center bg-ryno-900">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/50">
            Finding your latest month…
          </p>
        </div>
      }
    >
      <ToLatestMonth />
    </Suspense>
  );
}

async function ToLatestMonth(): Promise<null> {
  await connection();
  redirect(`/recap/${lastCompleteMonth(toDateKey(new Date()))}`);
}
