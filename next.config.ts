import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Cache Components is what makes the dashboard's caching story work: the
   * shell prerenders, the filtered data streams in behind Suspense, and the
   * expensive read (`getDashboardSnapshot`) is a `use cache` function with a
   * lifetime and a tag rather than an ad-hoc in-memory map.
   */
  cacheComponents: true,

  // `typedRoutes` is off on purpose: filters, sort and pagination are all
  // composed into the query string at runtime, so nearly every href in this
  // app is a computed string. Typed routes would turn that into a wall of
  // casts for no real safety.
  typedRoutes: false,

  // Pin the workspace root. Without it Turbopack walks up and finds an
  // unrelated lockfile in the home directory, then warns about it on every run.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },

  images: {
    // The sandbox serves avatars and product shots from these three hosts.
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "https", hostname: "ui-avatars.com" },
    ],
  },
};

export default nextConfig;
