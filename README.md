# RYNO Vendor Panel

The vendor panel for a delivery marketplace in Accra, built against the
Vendor Panel API for **Kaya Market** — a supermarket chain with seven branches
and ~1,400 orders over 18 months.

Four core pages — Dashboard, Order List, Order Details, Reviews & Ratings —
plus the two bonus surfaces (Products, Shops).

- **Live:** https://ryno-vendor-panel.vercel.app
- **Repo:** https://github.com/CarlaKanso/ryno-vendor-panel
- **Stack:** Next.js 16 (App Router, Cache Components) · React 19 · TypeScript
  strict · Tailwind CSS v4 · Motion · Recharts · ExcelJS · Vitest

---

## Running it locally

**Requires Node 22.12 or newer** (`.nvmrc` pins 24). Next.js 16 needs 20.9+,
and Vitest needs 22.12+, so 22.12 is the real floor. `nvm use` picks it up.

```bash
git clone https://github.com/CarlaKanso/ryno-vendor-panel.git
cd ryno-vendor-panel
nvm use                      # optional, if you use nvm
npm install
cp .env.example .env.local   # then paste the API key into .env.local
npm run dev
```

Then open http://localhost:3000.

`.env.local` needs two values, both server-side only:

```
VENDOR_API_URL=https://ychnmpxvxvqhjmofobze.supabase.co/functions/v1/vendor-api
VENDOR_API_KEY=vp_…
```

Neither is prefixed `NEXT_PUBLIC_`, and `.env.local` is gitignored — the
committed `.env.example` documents the shape without the secret. On Vercel the
same two names go in the project's environment variables.

| Command             | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Dev server on http://localhost:3000   |
| `npm run build`     | Production build                      |
| `npm test`          | Unit tests (Vitest)                   |
| `npm run typecheck` | `tsc --noEmit`                        |
| `npm run lint`      | ESLint, including the React Compiler rules |

---

## Folder structure

```
src/
  app/
    (panel)/                  Route group: everything inside the panel chrome
      layout.tsx              Sidebar + top bar + breadcrumbs
      page.tsx                Dashboard
      orders/                 List → [orderNo] → [orderNo]/invoice
      reviews/  products/  shops/
      error.tsx  not-found.tsx
    api/export/               Route Handlers that stream .xlsx downloads
  actions/                    "use server" — every write, one per domain
  components/
    shell/  ui/  motion/      Chrome, primitives, shared motion vocabulary
    dashboard/  orders/  order-detail/  reviews/  products/
  lib/
    api/                      The only place the API is called (server-only)
    analytics.ts              KPI / chart / ranking maths — pure, tested
    money.ts  dates.ts        Money and time — pure, tested
    search-params.ts          URL state, read and written from one module
    status.ts                 Status labels, badge colours, timeline steps
tests/                        Vitest specs for the pure modules
```

---

## Architecture decisions

### The API key never reaches the browser

Every call goes through `lib/api/http.ts`, which starts with `import
"server-only"`. That makes importing it from a Client Component a **build**
error, not something to catch in review. Client Components reach the API in
exactly two ways — Server Actions in `src/actions/`, and the two export Route
Handlers — and both run on the server.

### Server and client split

Pages are Server Components that fetch and shape data. The client boundary
starts where interaction does: filter forms, dialogs, tables with row actions.
The one stateful client surface of any size is `OrderWorkspace`, which owns the
order while the vendor acts on it.

### URL state

Filters, search, sort, page size and page number all live in the query string.
`lib/search-params.ts` is the only module that knows the parameter names, and
it is shared by the Server Components that read them and the Client Components
that write them. Two consequences worth having: a filtered, sorted, paginated
view is a shareable link, and **Download Excel needs no extra plumbing** — the
export Route Handler reads the same query string the page did, so the
spreadsheet is always exactly what is on screen.

### Errors

`ApiError` carries the API's `error.code` and `error.message`. Server Actions
return `{ ok: false, message }` rather than throwing, because a thrown Server
Action reaches production as an opaque digest — and those messages are written
to be shown to a vendor. A `409 conflict` is special-cased: the toast offers a
**Reload** that re-reads the order, since a conflict means someone else moved
it on.

### Money

The API sends money as JSON numbers with 2 decimals. Adding those with `+`
drifts — `1.15 * 100` is `114.99999999999999` — so every total is accumulated
in integer pesewas and converted back only for display. Over 1,400 orders the
difference is visible in a KPI card. This is the best-tested part of the code.

### Dates

Everything is formatted and bucketed in **UTC**, which is Accra time. Using the
browser's local zone would move an order across a day boundary for anyone
outside Ghana and quietly shift a KPI. No date is hard-coded; "today" is read
at request time and threaded through.

---

## Loading and caching 1,400+ orders

The API caps a page at 100 rows and does no aggregation, so any KPI needs the
rows themselves. The two pages solve that differently on purpose.

**Order List — no caching, one request per view.** Filtering, sorting and
paging are all pushed to the API. A page view is a single request for 10–100
rows, and it stays that way at any data volume. It is deliberately uncached:
the list is the vendor's working queue, and a stale row after accepting an
order is worse than one more round trip.

**Dashboard — one cached snapshot, filtered in memory.**
`getDashboardSnapshot()` (`lib/api/orders.ts`) fetches every non-archived order
with `include=items`, following pagination four requests at a time, and
projects each order down to the ten or so fields the dashboard actually reads.

Three things make that work:

1. **Caching the collection, not the query.** Caching per filter combination
   would almost never hit — the date range alone has unbounded cardinality.
   Caching the whole collection once and filtering in memory means changing a
   filter costs **zero** network calls; the KPIs, the chart and both Top
   Selling tabs are then pure functions over one array.
2. **The projection.** Keeping only what the dashboard reads takes the payload
   from several MB to a few hundred KB — the difference between a sensible
   cache entry and a silly one.
3. **`use cache` with a lifetime and a tag.** `cacheLife('minutes')` bounds
   staleness; every order write calls `updateTag('orders')`, which expires it
   immediately so the vendor sees their own change at once.

**Partial prerendering ties it together.** No page awaits `searchParams` in its
body — the promise is passed into Suspense-wrapped sections that await it
themselves. The shell (sidebar, headings, card frames, skeletons) is static
HTML served instantly; each section streams in as its own query resolves, so
nothing waits on the slowest one. `next build` confirms every page is ◐
(Partial Prerender) rather than ƒ (dynamic).

**Where it stops working:** the snapshot is O(all orders) in memory. Somewhere
in the tens of thousands of rows this has to become a server-side aggregate
endpoint — but the backend isn't mine in this exercise, so this is the right
trade for 1,400.

---

## Actions

Order Details renders its status buttons **straight from
`allowed_transitions`**. Nothing in the UI knows that `accepted` follows
`pending`; if the API adds a state, a button for it appears without a code
change.

Every write goes through one path (`useOrderActions`), which gives, uniformly:

- **No manual refresh.** Each write returns the full updated order, which
  replaces client state — the timeline, totals, lines and available actions all
  re-render from one response, with no second fetch.
- **No double submits.** One `pendingAction` key is held app-wide: while any
  action runs every button is disabled and the pressed one shows a spinner.
- **Confirmation on destructive actions,** with a reason modal (preset reasons
  plus "Other") for cancel and refund, as the API requires.
- **Errors as toasts** carrying `error.message`; 409s offer a reload.

---

## Design & motion

Colours, type and the mascot come from the RYNO brand kit: `#395f2d` green,
`#f9cb15` yellow, Figtree for text. _Bebas Neue Pro_ is licensed, so its free
sibling **Bebas Neue** stands in for the display role — swapping it back is one
line in `app/layout.tsx`.

Motion is a shared vocabulary (`components/motion/variants.ts`), not per-
component invention: one spring, small distances, short durations. It is used
where it carries meaning — the sidebar's active pill slides between items, KPIs
count up, the revenue area draws in, the tracking timeline fills to the current
step, table rows stagger, ranking bars grow from zero, dialogs spring in. The
whole vocabulary collapses to ~0ms under `prefers-reduced-motion`, and KPI
numbers render their real value in the server HTML so a card never reads "0"
before JavaScript runs.

Accessibility basics throughout: labelled controls, a visible brand focus ring,
`aria-sort` on sortable headings, `aria-current` on the active nav item,
focus-trapped dialogs that restore focus on close, `sr-only` table captions,
and ratings exposed as "Rated 4 out of 5" rather than five separate icons.
Tables scroll horizontally inside their card rather than pushing the page wide,
so the panel is usable on a tablet.

---

## Tests

```bash
npm test
```

65 tests over the parts where being wrong is expensive and the logic is pure:

- **`money`** — integer-pesewas arithmetic, the float-drift cases, formatting.
- **`analytics`** — every KPI definition from the brief, including that
  cancelled and refunded orders carry money fields that must _not_ reach Total
  Sales; category matching across line items; empty periods rendering as zeros;
  Top Items counting only `available` lines on `completed` orders.
- **`dates`** — the `17th Sep 2026 09:40 AM` format, ordinal suffixes including
  the teens, UTC correctness, Monday-started week buckets.
- **`search-params`** — clamping, enum tampering, backwards date ranges, and
  the rule that changing a filter resets the page but paging does not.

Nothing mocks the network, because nothing under test touches it.

---

## Assumptions

- **"Vendor Name"** on the order list comes from `GET /v1/vendor`; the list
  endpoint doesn't embed it and there is one vendor per key.
- **Top Items** counts `quantity` on `available` lines of `completed` orders,
  per the brief. Its money column is those lines' `line_total`.
- **Recent Orders / Recent Reviews** honour the dashboard filters. Reviews have
  no category dimension, so only shop and date apply there.
- **Chart granularity** defaults to daily/weekly/monthly based on the range
  width, so a 550-day range doesn't open as 550 bars. The toggle overrides it
  and lands in the URL.
- **The invoice** is a print-styled page, not a generated PDF: the browser's
  print dialog gives "Save as PDF" on every platform, the layout stays
  selectable and searchable, and there is no PDF library to maintain. Lines
  marked not available are listed but not charged, so the customer can see what
  was dropped.
- **Archived orders** are excluded from the dashboard entirely, and reachable
  from the order list via the "Show archived orders" toggle with a Restore
  action per row.
- **Deleting a product** is the API's soft delete, so the row stays and is
  marked *Discontinued* rather than vanishing — it is still on past orders.

---

## What I'd do differently with more time

- **`'use cache: remote'` for the dashboard snapshot.** On Vercel, `use cache`
  entries live in per-instance memory, so cross-request hit rates in serverless
  are low. Switching that one function to the remote cache is a one-line change
  that would make the cache shared across instances; I left it on the in-memory
  default rather than ship a hosting dependency I couldn't verify end-to-end.
- **Optimistic updates** on the cheap, obviously-reversible actions (marking a
  line unavailable) via `useOptimistic`. Today every action waits for the
  server round trip. It is honest and never shows a lie, but it is ~300ms
  slower than it needs to feel.
- **Playwright coverage** of the two flows worth protecting end-to-end: the
  status workflow, and "filter → export → the spreadsheet matches the screen".
  Unit tests cover the maths; nothing today catches a broken wiring between
  page and export.
- **A saved-views feature.** Since all list state is already in the URL, letting
  a vendor bookmark "Spintex, pending, this week" inside the app is mostly UI.
- **Real image handling.** Product images are served `unoptimized` from a
  third-party demo host. With a real CDN I'd size and optimise them properly.
- **Revisit the dashboard snapshot** if order volume grows, per the note above.

---

## Notes on the sandbox

While testing the write paths I assigned and then removed a driver on order
`#42878891` (the API keeps both events in its activity log — that's the API's
behaviour, not a bug here), and left one vendor reply on review of order
`#42720511` so the reply, edit and delete flows are visible without hunting.
Happy to have the data reset before the walkthrough.
