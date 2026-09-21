"use client";

import {
  LayoutDashboard,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Star,
  Store,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useSyncExternalStore } from "react";

import { cn } from "@/lib/cn";
import { softSpring } from "../motion/variants";
import {
  getServerSnapshot,
  getSnapshot,
  setCollapsed,
  subscribe,
} from "./sidebar-store";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/orders", label: "Orders", icon: ReceiptText, exact: false },
  { href: "/reviews", label: "Reviews", icon: Star, exact: false },
  { href: "/products", label: "Products", icon: Package, exact: false },
  { href: "/shops", label: "Shops", icon: Store, exact: false },
] as const;

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The wordmark block. Collapsed, only the submark remains. */
function Brand({ vendorName, collapsed }: { vendorName: string; collapsed: boolean }) {
  return (
    <div className="flex h-16 items-center gap-2.5 px-4">
      <Image
        src="/brand/ryno-icon.png"
        alt=""
        width={36}
        height={36}
        className="shrink-0 rounded-lg"
        priority
      />
      <AnimatePresence initial={false}>
        {!collapsed ? (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.15 }}
            className="min-w-0"
          >
            <p className="font-display text-xl leading-none tracking-wide text-white">
              RYNO
            </p>
            <p className="mt-0.5 truncate text-[11px] text-ryno-100/70">{vendorName}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * `layoutId` lets the active pill slide between items instead of blinking from
 * one to the next — the one bit of motion in the shell that carries meaning.
 * The desktop rail and the mobile drawer use different ids so the two never
 * try to animate one pill between them.
 */
function NavList({
  collapsed,
  layoutPrefix,
}: {
  collapsed: boolean;
  layoutPrefix: string;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 px-3" aria-label="Main">
      {NAV.map((entry) => {
        const active = isActive(pathname, entry.href, entry.exact);
        const Icon = entry.icon;

        return (
          <Link
            key={entry.href}
            href={entry.href}
            aria-current={active ? "page" : undefined}
            title={collapsed ? entry.label : undefined}
            className={cn(
              "relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              active ? "text-white" : "text-ryno-100/80 hover:bg-white/10 hover:text-white",
            )}
          >
            {active ? (
              <motion.span
                layoutId={`${layoutPrefix}-active`}
                transition={softSpring}
                className="absolute inset-0 rounded-lg bg-white/15 ring-1 ring-inset ring-white/20"
                aria-hidden
              />
            ) : null}
            <Icon className="relative size-5 shrink-0" aria-hidden />
            <AnimatePresence initial={false}>
              {!collapsed ? (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.15 }}
                  className="relative truncate"
                >
                  {entry.label}
                </motion.span>
              ) : null}
            </AnimatePresence>
            {active ? (
              <motion.span
                layoutId={`${layoutPrefix}-active-bar`}
                transition={softSpring}
                className="absolute right-0 h-6 w-1 rounded-l-full bg-gold-400"
                aria-hidden
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({
  vendorName,
  mobileOpen,
  onMobileClose,
}: {
  vendorName: string;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Navigating on a phone should put the drawer away.
  useEffect(() => {
    onMobileClose();
  }, [pathname, onMobileClose]);

  return (
    <>
      <motion.aside
        animate={{ width: collapsed ? 76 : 244 }}
        initial={false}
        transition={softSpring}
        className="sticky top-0 hidden h-dvh shrink-0 flex-col bg-ryno-700 lg:flex"
      >
        <Brand vendorName={vendorName} collapsed={collapsed} />
        <NavList collapsed={collapsed} layoutPrefix="rail" />
        <div className="p-3">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-ryno-100/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-5 shrink-0" aria-hidden />
            ) : (
              <PanelLeftClose className="size-5 shrink-0" aria-hidden />
            )}
            {!collapsed ? <span>Collapse</span> : null}
          </button>
        </div>
      </motion.aside>

      <AnimatePresence>
        {mobileOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-ink-900/40"
              onClick={onMobileClose}
              aria-hidden
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={softSpring}
              className="relative flex h-full w-[260px] flex-col bg-ryno-700"
            >
              <div className="flex items-center justify-between pr-3">
                <Brand vendorName={vendorName} collapsed={false} />
                <button
                  type="button"
                  onClick={onMobileClose}
                  className="rounded-md p-1.5 text-ryno-100/80 hover:bg-white/10 hover:text-white"
                  aria-label="Close navigation"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>
              <NavList collapsed={false} layoutPrefix="drawer" />
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
