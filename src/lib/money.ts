/**
 * Money helpers.
 *
 * The API sends money as JSON numbers with up to 2 decimals. Adding those up
 * with `+` drifts: `79.2 + 0.1 !== 79.3`. Over ~1,400 orders that drift is
 * visible in a KPI card, so every total in this app is accumulated in integer
 * pesewas (GHS minor units) and only converted back to a decimal at the edge.
 */

/** Converts a GHS amount to integer pesewas. */
export function toPesewas(amount: number | null | undefined): number {
  if (amount == null || !Number.isFinite(amount)) return 0;
  // `Math.round` after scaling fixes representations like 12.344999999999999.
  return Math.round(amount * 100);
}

/** Converts integer pesewas back to a GHS amount. */
export function fromPesewas(pesewas: number): number {
  return pesewas / 100;
}

/** Sums a list of GHS amounts without floating-point drift. */
export function sumMoney(amounts: Array<number | null | undefined>): number {
  let pesewas = 0;
  for (const amount of amounts) pesewas += toPesewas(amount);
  return fromPesewas(pesewas);
}

/** Sums one money field across a list of records. */
export function sumBy<T>(rows: readonly T[], pick: (row: T) => number | null | undefined): number {
  let pesewas = 0;
  for (const row of rows) pesewas += toPesewas(pick(row));
  return fromPesewas(pesewas);
}

const currencyFormatters = new Map<string, Intl.NumberFormat>();

function formatterFor(currency: string): Intl.NumberFormat {
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    // `en-GH` formats GHS as "GHS 12,480.50" with a non-breaking space; the
    // grouping and the two decimals are what the brief asks for.
    formatter = new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency,
      currencyDisplay: "code",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    currencyFormatters.set(currency, formatter);
  }
  return formatter;
}

/** `formatMoney(12480.5)` → `"GHS 12,480.50"`. */
export function formatMoney(amount: number | null | undefined, currency = "GHS"): string {
  const value = amount == null || !Number.isFinite(amount) ? 0 : amount;
  return formatterFor(currency).format(value).replace(/ /g, " ");
}

/** Same as `formatMoney` but without the currency code, for dense tables. */
export function formatAmount(amount: number | null | undefined): string {
  const value = amount == null || !Number.isFinite(amount) ? 0 : amount;
  return new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** `formatCount(1400)` → `"1,400"`. */
export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-GH").format(value);
}

/** Shortens money for chart axes: 12480.5 → "12.5k". */
export function formatCompactAmount(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toFixed(0);
}
