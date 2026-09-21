import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Figtree } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";

/**
 * Typography from the RYNO brand kit. Bebas Neue Pro is a licensed family, so
 * its free sibling Bebas Neue stands in for the display/sub-heading role —
 * same proportions, and swapping it later is one line.
 */
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Vendor Panel · RYNO",
    template: "%s · RYNO Vendor Panel",
  },
  description:
    "Watch sales, manage incoming orders and reply to customer reviews across every branch.",
  icons: { icon: "/brand/ryno-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#395f2d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${bebas.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: "rounded-xl border border-ink-200 shadow-card-hover",
            },
          }}
        />
      </body>
    </html>
  );
}
