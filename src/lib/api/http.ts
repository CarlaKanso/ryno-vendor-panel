import "server-only";

import type { ApiErrorBody } from "./types";

/**
 * The single place the API key is read, and the single place a request leaves
 * this app. `server-only` makes importing this from a Client Component a build
 * error, so the key cannot reach the browser by accident.
 *
 * Requests are always `no-store`. Caching is expressed one level up with the
 * `use cache` directive (see `lib/api/orders.ts`), which caches the *projected*
 * result rather than raw HTTP responses — a much smaller thing to hold, and
 * invalidated by tag when a write happens.
 */

const BASE_URL = process.env.VENDOR_API_URL;
const API_KEY = process.env.VENDOR_API_KEY;

/** An error carrying the API's own `error.message`, which is safe to show. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }

  /** 409 means someone else moved the order on; the UI offers a reload. */
  get isConflict() {
    return this.status === 409;
  }

  get isNotFound() {
    return this.status === 404;
  }
}

export type QueryValue = string | number | boolean | null | undefined;

/** Drops empty values so `?shop_id=` never reaches the API. */
export function toQueryString(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, QueryValue>;
};

function requireConfig(): { baseUrl: string; apiKey: string } {
  if (!BASE_URL || !API_KEY) {
    throw new ApiError(
      500,
      "configuration_error",
      "The vendor API is not configured. Set VENDOR_API_URL and VENDOR_API_KEY.",
    );
  }
  return { baseUrl: BASE_URL.replace(/\/$/, ""), apiKey: API_KEY };
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { baseUrl, apiKey } = requireConfig();
  const { method = "GET", body, query } = options;

  const url = `${baseUrl}${path}${toQueryString(query ?? {})}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        "x-api-key": apiKey,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      503,
      "network_error",
      "Could not reach the vendor API. Check your connection and try again.",
    );
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const error = (payload as ApiErrorBody | null)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "unknown_error",
      error?.message ?? `Request failed with status ${response.status}.`,
    );
  }

  return payload as T;
}

/**
 * Runs `tasks` with a cap on how many are in flight at once.
 *
 * The API caps a page at 100 rows, so "all orders matching these filters" is
 * always several requests. Firing all 14 at once is rude to the upstream and
 * risks rate limits; doing them one by one is 14 round trips of latency. Four
 * at a time is the compromise.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    (async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await task(items[index], index);
      }
    })(),
  );

  await Promise.all(workers);
  return results;
}
