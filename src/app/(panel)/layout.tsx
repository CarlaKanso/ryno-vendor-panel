import { Suspense } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { getVendor } from "@/lib/api/vendor";
import type { Vendor } from "@/lib/api/types";

/**
 * The shared layout for every panel page.
 *
 * The vendor profile is cached (`use cache`, hours), so the shell is part of
 * the prerendered shell and the rail paints before any page data arrives.
 */

const FALLBACK_VENDOR: Vendor = {
  id: "",
  name: "Vendor Panel",
  about: null,
  email: null,
  phone: null,
  currency: "GHS",
  logo_url: null,
  timezone: "Africa/Accra",
  commission_rate: 0,
};

async function Shell({ children }: { children: React.ReactNode }) {
  // The chrome must render even when the API is down — the error inside the
  // page says what happened; a blank screen would not.
  let vendor = FALLBACK_VENDOR;
  try {
    vendor = await getVendor();
  } catch {
    // fall through with the placeholder
  }

  return <AppShell vendor={vendor}>{children}</AppShell>;
}

export default function PanelLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-canvas" />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
