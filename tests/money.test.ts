import { describe, expect, it } from "vitest";

import {
  formatAmount,
  formatCompactAmount,
  formatCount,
  formatMoney,
  fromPesewas,
  sumBy,
  sumMoney,
  toPesewas,
} from "@/lib/money";

describe("toPesewas", () => {
  it("scales cedis to integer minor units", () => {
    expect(toPesewas(12.34)).toBe(1234);
    expect(toPesewas(0)).toBe(0);
    expect(toPesewas(675)).toBe(67_500);
  });

  it("rounds away the float representation of a 2-decimal value", () => {
    // 1.15 * 100 is 114.99999999999999 in IEEE 754; truncating would lose a
    // pesewa on every such line.
    expect(1.15 * 100).not.toBe(115);
    expect(toPesewas(1.15)).toBe(115);
    expect(toPesewas(8.165)).toBe(816);
    expect(toPesewas(79.2)).toBe(7920);
  });

  it("treats missing and non-finite amounts as zero", () => {
    expect(toPesewas(null)).toBe(0);
    expect(toPesewas(undefined)).toBe(0);
    expect(toPesewas(Number.NaN)).toBe(0);
    expect(toPesewas(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("round-trips through fromPesewas", () => {
    for (const amount of [0, 0.01, 12.34, 79.2, 1410, 43_991.78]) {
      expect(fromPesewas(toPesewas(amount))).toBe(amount);
    }
  });
});

describe("sumMoney", () => {
  it("does not drift the way a plain + does", () => {
    // The naive sum of these is 0.30000000000000004.
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
  });

  it("stays exact across a long run of 2-decimal amounts", () => {
    const amounts = Array.from({ length: 1400 }, () => 10.07);
    expect(sumMoney(amounts)).toBe(14_098);
  });

  it("ignores nulls rather than producing NaN", () => {
    expect(sumMoney([10.5, null, 4.5, undefined])).toBe(15);
  });

  it("sums an empty list to zero", () => {
    expect(sumMoney([])).toBe(0);
  });
});

describe("sumBy", () => {
  it("sums one field across records", () => {
    const rows = [{ total: 79.2 }, { total: 0.1 }, { total: 20.7 }];
    expect(sumBy(rows, (row) => row.total)).toBe(100);
  });
});

describe("formatting", () => {
  it("formats money as GHS with grouping and two decimals", () => {
    expect(formatMoney(12_480.5)).toBe("GHS 12,480.50");
    expect(formatMoney(0)).toBe("GHS 0.00");
    expect(formatMoney(675)).toBe("GHS 675.00");
  });

  it("keeps two decimals for a null amount instead of rendering a dash", () => {
    expect(formatMoney(null)).toBe("GHS 0.00");
  });

  it("formats bare amounts for dense table columns", () => {
    expect(formatAmount(1410)).toBe("1,410.00");
    expect(formatAmount(0.5)).toBe("0.50");
  });

  it("formats counts with grouping", () => {
    expect(formatCount(1400)).toBe("1,400");
  });

  it("shortens large numbers for chart axes", () => {
    expect(formatCompactAmount(950)).toBe("950");
    expect(formatCompactAmount(12_480.5)).toBe("12.5k");
    expect(formatCompactAmount(2_400_000)).toBe("2.4m");
  });
});
