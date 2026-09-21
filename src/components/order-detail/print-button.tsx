"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Opens the browser's print dialog, where "Save as PDF" also lives. */
export function PrintButton() {
  return (
    <Button
      variant="primary"
      onClick={() => window.print()}
      icon={<Printer className="size-4" aria-hidden />}
    >
      Print / Save as PDF
    </Button>
  );
}
