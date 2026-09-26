# RYNO Vendor Panel

The vendor panel for a delivery marketplace in Accra, built against the
Vendor Panel API for **Kaya Market** — a supermarket chain with seven branches
and ~1,400 orders over 18 months.

Four core pages — Dashboard, Order List, Order Details, Reviews & Ratings —
plus the two bonus surfaces (Products, Shops), and two things of my own:
[**Rush Hours**](#rush-hours), a weekday × hour heatmap of when orders actually
arrive, and the [**Monthly Recap**](#monthly-recap), a vendor's month told as a
short animated story.

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

## Rush Hours

Every KPI in the brief answers the same kind of question — *how much did we
sell?* None of them answer the one a branch manager asks on a Friday: *when
does somebody need to be on the floor?* That question is already in the data,
because every order carries the minute it was placed, and nothing in the panel
was reading it.

So the dashboard carries one card that isn't in the brief: a weekday × hour
heatmap of when orders arrive. On this vendor's data it shows the answer
immediately — Kaya Market has **two** rushes a day, 11 AM–2 PM and 6 PM–9 PM,
and Saturday carries 17% of the week.

Four decisions in it are worth explaining.

### Every order counts, whatever its status

The KPI cards are careful to keep cancelled and refunded orders out of Total
Sales. This card deliberately does the opposite and counts them: a cancelled
order still arrived at 1 PM and still needed a picker to look at it. A staffing
pattern is about demand, not money. The instant used is `created_at` — when the
customer pressed the button — rather than `completed_at`, which describes the
driver's day rather than the shop's.

### A row is every Monday, and the card has to say so

A row is not one Monday — it is all 78 of them stacked. That pooling is the
whole point (this vendor averages 2.2 orders across an entire Monday, so a
single day alone is dots, not a pattern; it is the same thing Google Maps does
with "Popular times"). But the first version printed `22` and left the reader
to work out that it meant 22 orders across 78 Mondays, which is a question
someone should not have to ask.

So the card now says it in the subtitle, the footnote gives the denominator
(`78–79 of each weekday in this window`), and a `/day` column on the right
carries the average for one such day — `3.0` on a Saturday against `2.2` on a
Monday. The totals answer *when*; the average answers *is that actually a lot*.

That column also quietly fixes an unfairness in comparing rows: this window
holds 79 Tuesdays but only 78 Saturdays, so the raw totals are not quite like
for like. `countWeekdays` walks the span rather than dividing by seven, because
a window almost never contains whole weeks.

**What it divides by** is the window the card says it read, which is not the
same as the days that happened to hold an order. Dividing by the latter was a
real bug: ask for January and February with orders only in the last fortnight
of February and the observed span holds two Mondays, so the column reported
`3.0` per Monday where the honest figure over the eight Mondays asked about is
`0.8`. A quiet Monday is still a Monday.

So a selected range is used whole, minus only the part of it that has not
happened yet — ask for "this month" on the 14th and the Mondays still to come
are not Mondays anybody failed to sell on. Nothing is trimmed off the front: a
Monday before this vendor's first order still counts, because pulling the
average down is the truthful direction to be wrong in. `today` is passed in
rather than read from the clock, like every other date in this codebase.

### A pattern needs a sample, so the card widens its own window

This is the decision the card lives or dies on. The dashboard opens on the last
30 days, which for this vendor is ~100 orders. Spread over a weekday × hour
grid that is **133 live cells averaging under one order each**, where the
busiest cell holds four. At that density the darkest cell is one order away
from the lightest, and the card would point confidently at a "peak" that is
noise.

So `buildRushHours` takes the filtered orders *and* the same orders without the
date range, and picks: below 300 orders it reads from everything it has and
sets `widened`, which the card states in plain words underneath — *"The
selected range held 82, too few to read an hourly pattern from, so the grid
widened to every order."* Branch and category filters always apply, because
those slice the pattern without thinning it past the point of meaning.

Overriding a filter silently would be a bug. Overriding it and saying so, with
the number that forced the decision, is the honest version.

### …but the rule picks the default, not the answer

The first version of that rule had no way out, which made it the one card on
the dashboard that could refuse a question. "What did February look like?" is a
fair thing to ask — for a promotion post-mortem, say — and a card that answers
a different question instead is worse than one that answers with a caveat
attached.

So the sample-size rule now only chooses the **default**, exactly as
`suggestGranularity` does for the revenue chart, and a **This range · All time**
toggle in the header puts the decision back in reach, with each side showing
what it holds (`This range 69` / `All time 1,400`) so the trade-off is visible
before you click. It is two `<Link>`s rather than a client component — the
choice is a `rush=` URL parameter like every other filter, so it survives a
refresh and can be sent to somebody.

The footnote then has three things to say, and the difference matters:

| State | What the card says |
|---|---|
| Rule widened it | *"The selected range held 69 … switch it back with **This range** above."* |
| Vendor chose a thin range | *"That is the range you asked for — but 69 orders over 28 days is a thin sample … treat the shape as a hint rather than a finding."* |
| Vendor chose all time | Nothing. They were not overridden and are owed no explanation. |

That middle row is the important one. February really does read differently —
the busiest day flips from Saturday to Sunday and the peak becomes a cell
holding **four** orders — which is precisely the noise the rule was protecting
the default view from. The vendor can now see it *and* be told why not to
redraw a rota around it.

### The grid only shows hours that exist

Columns are trimmed to the span that actually holds orders — 04:00 to 22:00
here — rather than 24 columns with a third of them permanently blank. The trim
is derived from the data on every render, not hard-coded to a trading day, so a
branch that opens later simply gets a narrower grid. Hours *inside* the span
that happen to be empty stay as empty cells, because a gap at 3 PM is a fact
about the day, not padding.

### The week, and then the day

Under the seven weekday rows sits a `<tfoot>` of column totals drawn as bars —
the same week collapsed onto one axis. The grid answers *which* day and hour;
the strip is the shape of the day itself, and it is where "two rushes" stops
being a claim in the footer and becomes a silhouette you can see. Every fact in
that footer points at something in the grid: the rush hours darken their own
column labels, the busiest day darkens its row label, and the peak hour wears a
gold ring with a slow ping.

### It ships no JavaScript

`RushHours` is a Server Component. The shades are class names, the reveal, the
bars and the hover are CSS, and the count is printed inside each cell — so
there is no chart library to hydrate and nothing to wait for. It is markup by
the time it reaches the browser, and it prerenders into the static shell with
the rest of the analytics block.

The motion is the vocabulary that was already there: cells `pop-in` on a
diagonal delay so the grid fills from Monday morning to Sunday night, the
totals `grow-up` from their baseline, and the peak's ping is one new keyframe
in `globals.css` rather than a one-off in a component. All of it collapses
under `prefers-reduced-motion` with everything else.

Hovering lifts a cell over its neighbours and lights up both of its headers.
The row half is plain CSS (`tr:hover th`), but nothing in the cascade reaches
*up* from a cell to the column header above it — so the column half is one
`:has()` rule per column, written out in `globals.css` for the 24 columns an
hour grid can ever have. It is the one place where a chart library would
usually be the answer, and `:has()` is cheaper than hydrating one.

Those rules started life generated into a `<style>` at render time, which was
wrong twice over: React only relocates a rendered stylesheet into `<head>`
once it hydrates, so the production HTML shipped a `<style>` sitting in
`<body>` where the spec does not allow one, and an inline sheet is the first
thing a `style-src` Content-Security-Policy drops. In the stylesheet they are
valid, cacheable, and working before any JavaScript runs — which is true of
the whole card: with JavaScript disabled the grid, the crosshair and the
scope toggle all still work, because the toggle is two `<a>`s.

Printing the number in the cell is also what keeps it honest: colour is the
summary, the number is the value, and nobody has to hover a tooltip to read
their own data. Underneath, it is a real `<table>` with `<th>` row and column
headers and a `sr-only` count in every cell, because a heatmap *is* a table of
numbers that happens to be coloured. Colour is never the only encoding: the
peak hour wears a gold outline and is also named in words in the footer.

The five greens are one hue from the brand ramp, light to dark — a magnitude
scale, so a second hue would invent a category that isn't in the data. Every
in-cell figure clears 4.9:1 against its own shade.

---

## Monthly Recap

Behind the **Monthly recap** button on the dashboard is `/recap`: one month of
the vendor's data, told as up to eight full-screen slides you scroll or arrow
through (a month with no reviews, say, simply has no reviews slide). *You handled 88 orders — one every 8½ hours, and −10% against July.*
*Your busiest day was Saturday, and the rush ran 11 AM–2 PM.* *Your best
seller. Your star branch. What customers said, with the best review of the
month in big type. One thing to fix: 19 items ran out, GHS 1,840 that was in
a basket and never sold.* Then the mascot says see you next month.

It is behind a button rather than in the way, because it is something you
watch, not something you work in — which is also why it lives outside the
`(panel)` route group, full-screen, with no sidebar and no filters.

### Why a recap

Every other surface in the panel answers a question the vendor came with. This
one is the panel telling *them* something, unprompted, in a form they would
show someone. It is the shape of thing a marketplace sends every vendor on the
first of the month — and every number in it comes from data the dashboard was
already holding.

### It is the same maths, told differently

The recap computes nothing new about orders. `computeKpis` runs twice (this
month and last, for the comparison), `buildRushHours` gives the rush slide,
`topItems` and `topShops` give the next two — all of them the tested functions
the dashboard uses, applied to one month of the same cached snapshot. The only
new counting is `dropReport`, which sums the lines a picker marked unavailable
on completed orders and what they were worth, and `bestReview`, which picks the
highest rating and, among those, the one with the most to say.

A month is read as itself, thin or not. The sample-size rule that guards the
dashboard's default view would be wrong here: a recap of August is *about*
August, and August's 88 orders are the story whether or not they make a
statistically confident heatmap.

### Choreography without a framework

Each slide plays when you arrive at it, not all at once on load. The mechanism
is smaller than it looks: the deck is a client component whose only real job
is an `IntersectionObserver` that marks a slide `data-seen` the first time
half of it is in view. The entrances themselves are the CSS vocabulary the
rest of the app uses (`rise-in`, `grow-x`, `grow-up`, `pop-in`), defined
unconditionally and merely *held paused* inside any slide not yet reached.
The cover is marked seen in the server HTML, so it plays on first paint with
no wait for hydration.

The pause is a plain CSS default (`:not([data-seen])` holds an entrance at
its first frame) rather than something a `useEffect` switches on, which was
the first version's actual bug: flipping it on from an effect means it can
only win a race against the browser's own paint — a cold load usually gives
the effect enough time to pause things first, but a warm one (a repeat
visit, nothing left to parse) can let every entrance on every slide start
and finish off-screen before that effect gets a turn, so scrolling down
later finds every slide already resolved and looking like nothing ever
played. A plain CSS rule applies with the stylesheet, before any script
runs, on every load alike. The one thing CSS cannot express on its own is
"is a script running" — which is what decides whether a later slide will
ever be marked seen at all — so a `<noscript>` block is what un-pauses
everything for a reader with JavaScript off, the one purpose-built tool for
exactly that distinction. Count-ups reuse
`AnimatedNumber`, mounted only once the slide is reached so the count happens
on arrival. Printing gives one slide per page with every entrance finished.

Keys: arrows, page keys and space move between slides; Escape goes home. The
overlay chrome — home, print, the step dots — recolours with the slide under
it, white on the deep green and ink on gold and on the light slides.

`/recap` itself is a door: it redirects to the last *complete* month, chosen
at request time behind a Suspense boundary (a recap of a month still running
would congratulate the vendor on numbers about to change). Any month is
reachable at `/recap/YYYY-MM`; a month that has not begun is a 404.

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
step, table rows stagger, ranking bars grow from zero, the Rush Hours grid
fills on a diagonal and its hour totals grow up from the baseline, dialogs
spring in. The
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

108 tests over the parts where being wrong is expensive and the logic is pure:

- **`money`** — integer-pesewas arithmetic, the float-drift cases, formatting.
- **`analytics`** — every KPI definition from the brief, including that
  cancelled and refunded orders carry money fields that must _not_ reach Total
  Sales; category matching across line items; empty periods rendering as zeros;
  Top Items counting only `available` lines on `completed` orders.
- **`dates`** — the `17th Sep 2026 09:40 AM` format, ordinal suffixes including
  the teens, UTC correctness, Monday-started week buckets, and the hour labels
  Rush Hours reads from (`formatHourRange(12, 14)` is `"12 PM – 3 PM"`, because
  a shift is spoken with an exclusive end).
- **`rush hours`** — weekday and hour bucketing in UTC with Monday first,
  counting every status, trimming the dead hours, shading relative to the
  busiest slot, naming both rushes when there are two, counting how many of each
  weekday a span holds (including the partial weeks at its edges), and the
  sample-size rule: it widens when the range is thin, does *not* claim to have
  widened when there was nothing more to widen to, and steps aside entirely
  when the vendor picks a scope from the toggle. The per-day denominator has
  its own set: the window asked for rather than the days that held an order,
  capped at today, and never trimmed at the front — including a property test
  pinning the constant-time weekday arithmetic against a day-by-day walk over
  eight shapes of span, leap day and year boundary included.
- **`search-params`** — clamping, enum tampering, backwards date ranges, and
  the rule that changing a filter resets the page but paging does not.
- **`recap`** — the drop report (completed orders only, summed in pesewas),
  which review gets quoted, the month-on-month comparison declining when there
  is no last month, and the whole recap assembled from an empty month without
  dividing by zero. Month keys — leap Februaries, year boundaries, and which
  month "last complete" means on the 1st — are under `dates`.

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
- **Rush Hours honours the shop and category filters, and widens its own date
  window by default** when the selected range holds fewer than 300 orders —
  stating on the card what it did and what the range held. The **This range /
  All time** toggle overrides that and lands in the URL as `rush=`. The
  reasoning is in [Rush Hours](#rush-hours).
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
