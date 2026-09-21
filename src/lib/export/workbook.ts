import "server-only";

import ExcelJS from "exceljs";

/**
 * Excel export.
 *
 * The API has no export endpoint, so the workbook is built here with ExcelJS
 * and streamed back from a Route Handler. Numbers are written as numbers with
 * a `#,##0.00` format, not as pre-formatted strings — the point of an .xlsx is
 * that the vendor can sum a column in Excel afterwards.
 */

export type Column<T> = {
  header: string;
  width?: number;
  value: (row: T, index: number) => string | number | null;
  /** Excel number format, e.g. `#,##0.00` for money. */
  numFmt?: string;
};

const BRAND_GREEN = "FF395F2D";

export async function buildWorkbook<T>({
  sheetName,
  title,
  subtitle,
  columns,
  rows,
}: {
  sheetName: string;
  title: string;
  subtitle: string;
  columns: Array<Column<T>>;
  rows: readonly T[];
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RYNO Vendor Panel";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 3 }],
  });

  // Two title rows, then the header row the freeze pane sits under.
  const titleRow = sheet.addRow([title]);
  titleRow.font = { bold: true, size: 14 };
  sheet.mergeCells(1, 1, 1, Math.max(columns.length, 1));

  const subtitleRow = sheet.addRow([subtitle]);
  subtitleRow.font = { size: 10, color: { argb: "FF737A78" } };
  sheet.mergeCells(2, 1, 2, Math.max(columns.length, 1));

  const headerRow = sheet.addRow(columns.map((column) => column.header));
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_GREEN } };
    cell.alignment = { vertical: "middle" };
  });
  headerRow.height = 22;

  rows.forEach((row, index) => {
    const values = columns.map((column) => column.value(row, index));
    const added = sheet.addRow(values);
    columns.forEach((column, columnIndex) => {
      if (column.numFmt) added.getCell(columnIndex + 1).numFmt = column.numFmt;
    });
  });

  columns.forEach((column, index) => {
    sheet.getColumn(index + 1).width = column.width ?? 18;
  });

  // `autoFilter` gives the vendor Excel's own filtering on top of ours.
  if (rows.length > 0) {
    sheet.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: 3 + rows.length, column: columns.length },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export const MONEY_FORMAT = "#,##0.00";

/** `Content-Disposition` with a timestamped, filesystem-safe filename. */
export function downloadHeaders(basename: string): HeadersInit {
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `${basename}-${stamp}.xlsx`;
  return {
    "Content-Type":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };
}
