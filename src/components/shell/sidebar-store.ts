"use client";

/**
 * The collapsed/expanded preference for the sidebar rail.
 *
 * `localStorage` cannot be read while rendering on the server, and reading it
 * during the client's first render would produce markup that disagrees with
 * the server's. `useSyncExternalStore` is the API built for exactly that: it
 * takes a server snapshot and a client snapshot and lets React reconcile them
 * after hydration, with no `setState` in an effect.
 *
 * Every access is wrapped, because `localStorage` throws outright in a private
 * window with site data blocked.
 */

const STORAGE_KEY = "ryno:sidebar-collapsed";

const listeners = new Set<() => void>();
let cached: boolean | null = null;

function readStorage(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);

  // Keep a second tab of the panel in step with this one.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cached = null;
    for (const listener of listeners) listener();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Must return a cached value, not a fresh read: `useSyncExternalStore` calls
 * this on every render and bails out only if the result is referentially equal.
 */
export function getSnapshot(): boolean {
  if (cached === null) cached = readStorage();
  return cached;
}

/** The rail renders expanded on the server, which is the common case. */
export function getServerSnapshot(): boolean {
  return false;
}

export function setCollapsed(collapsed: boolean): void {
  cached = collapsed;
  try {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    // A preference we cannot persist still works for this session.
  }
  for (const listener of listeners) listener();
}
