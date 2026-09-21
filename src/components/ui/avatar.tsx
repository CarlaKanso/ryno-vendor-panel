"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/cn";

/** Initials, used when someone has no avatar and as the fallback on a 404. */
function initialsOf(name: string): string {
  const parts = name
    .replace(/[^\p{L}\p{N}\s'-]/gu, "")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZES = {
  sm: "size-8 text-[11px]",
  md: "size-10 text-xs",
  lg: "size-12 text-sm",
} as const;

/**
 * `avatar_url` is null for plenty of customers and most drivers, and the
 * remote hosts occasionally 404, so both cases fall back to initials on a
 * brand-tinted circle rather than to a broken image.
 */
export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const pixels = size === "sm" ? 32 : size === "lg" ? 48 : 40;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-ryno-100 font-semibold text-ryno-700 ring-1 ring-ink-200",
        SIZES[size],
        className,
      )}
    >
      {showImage ? (
        <Image
          src={src as string}
          alt=""
          width={pixels}
          height={pixels}
          className="size-full object-cover"
          onError={() => setFailed(true)}
          unoptimized
        />
      ) : (
        <span aria-hidden>{initialsOf(name)}</span>
      )}
    </span>
  );
}
