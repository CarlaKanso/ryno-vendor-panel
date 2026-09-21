"use client";

import { FileSpreadsheet } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "./button";

/**
 * Downloads the current view as .xlsx.
 *
 * It fetches the Route Handler rather than pointing an `<a download>` at it,
 * for two reasons: the button can show a spinner while a 1,400-row workbook is
 * built, and a failure surfaces as a toast with the API's message instead of
 * replacing the page with a JSON error.
 */
export function ExportButton({
  endpoint,
  label = "Download Excel",
}: {
  endpoint: string;
  label?: string;
}) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const download = async () => {
    setLoading(true);
    try {
      const query = searchParams.toString();
      const response = await fetch(`${endpoint}${query ? `?${query}` : ""}`);

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message ?? "The export failed.");
      }

      const blob = await response.blob();
      const filename =
        response.headers
          .get("Content-Disposition")
          ?.match(/filename="(.+)"/)?.[1] ?? "export.xlsx";

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(objectUrl);

      toast.success(`${filename} downloaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The export failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="secondary"
      loading={loading}
      onClick={download}
      icon={<FileSpreadsheet className="size-4 text-ryno-600" aria-hidden />}
    >
      {loading ? "Preparing…" : label}
    </Button>
  );
}
