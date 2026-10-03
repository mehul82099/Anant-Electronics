import * as XLSX from "xlsx";
import type { CellValue } from "../types";
import { colLetter, isBlank } from "./cells";

export function isRedColor(colorObj: any): boolean {
  if (!colorObj) return false;
  if (colorObj.rgb) {
    const rgb = String(colorObj.rgb).toUpperCase();
    const hex = rgb.length === 8 ? rgb.slice(2) : rgb;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (r > 150 && g < 100 && b < 100) return true;
    if (r > 180 && g < 140 && b < 140 && r - g > 60) return true;
  }
  return false;
}

/** Thin, read-only view over a SheetJS worksheet with 1-based rows and 0-based column indexes. */
export interface Grid {
  name: string;
  ref: string | null;
  maxRow: number; // 1-based, inclusive
  maxCol: number; // 0-based, inclusive
  get(col: number, row: number): CellValue;
  /** Direct cell object access */
  cell(col: number, row: number): XLSX.CellObject | undefined;
  /** Check if cell or its font/fill is styled in red (meaning Out of Stock) */
  isRed(col: number, row: number): boolean;
  /** Check if any cell in this row is red */
  isRowRed(row: number): boolean;
  /** Excel number format of a cell (e.g. "d mmm") */
  format(col: number, row: number): string | undefined;
  /** formatted text as displayed by Excel/Sheets */
  display(col: number, row: number): string | undefined;
  /**
   * If (col,row) is covered by a merged range but is NOT its top-left cell, returns the anchor.
   */
  mergeAnchor(col: number, row: number): { col: number; row: number } | null;
  /** All non-blank cells of a row (whitespace-only cells excluded). */
  rowCells(row: number): { col: number; letter: string; raw: CellValue }[];
  nonBlankCount(): number;
}

export function makeGrid(name: string, ws: XLSX.WorkSheet | undefined): Grid {
  const ref = ws?.["!ref"] ?? null;
  const range = ref ? XLSX.utils.decode_range(ref) : null;
  const merges = (ws?.["!merges"] ?? []) as XLSX.Range[];

  const cell = (col: number, row: number): XLSX.CellObject | undefined =>
    ws ? (ws[XLSX.utils.encode_cell({ c: col, r: row - 1 })] as XLSX.CellObject | undefined) : undefined;

  const get = (col: number, row: number): CellValue => {
    const c = cell(col, row);
    if (!c || c.v === undefined || c.v === null) return null;
    if (c.v instanceof Date) return c.v.toISOString();
    if (typeof c.v === "string" || typeof c.v === "number" || typeof c.v === "boolean") return c.v;
    return String(c.v);
  };

  const isRed = (col: number, row: number): boolean => {
    const c = cell(col, row);
    if (!c || !c.s) return false;
    const s = c.s as any;
    return isRedColor(s.fgColor) || isRedColor(s.bgColor) || isRedColor(s.font?.color);
  };

  return {
    name,
    ref,
    maxRow: range ? range.e.r + 1 : 0,
    maxCol: range ? range.e.c : -1,
    get,
    cell,
    isRed,
    isRowRed(row: number) {
      if (!range) return false;
      // Check first 4 columns of the row (A, B, C, D)
      for (let c = range.s.c; c <= Math.min(range.e.c, 3); c++) {
        if (isRed(c, row)) return true;
      }
      return false;
    },
    format: (col, row) => cell(col, row)?.z as string | undefined,
    display: (col, row) => cell(col, row)?.w,
    mergeAnchor(col, row) {
      const r0 = row - 1;
      for (const m of merges) {
        if (r0 >= m.s.r && r0 <= m.e.r && col >= m.s.c && col <= m.e.c) {
          if (r0 === m.s.r && col === m.s.c) return null;
          return { col: m.s.c, row: m.s.r + 1 };
        }
      }
      return null;
    },
    rowCells(row) {
      const out: { col: number; letter: string; raw: CellValue }[] = [];
      if (!range) return out;
      for (let c = range.s.c; c <= range.e.c; c++) {
        const v = get(c, row);
        if (!isBlank(v)) out.push({ col: c, letter: colLetter(c), raw: v });
      }
      return out;
    },
    nonBlankCount() {
      if (!range) return 0;
      let n = 0;
      for (let r = range.s.r + 1; r <= range.e.r + 1; r++) n += this.rowCells(r).length;
      return n;
    },
  };
}

export function readWorkbook(buffer: ArrayBuffer | Uint8Array): XLSX.WorkBook {
  return XLSX.read(buffer, { type: "array", cellDates: false, cellNF: true, cellText: true, cellStyles: true, dense: false });
}

export function isDateFormat(fmt: string | undefined): boolean {
  if (!fmt) return false;
  try {
    return XLSX.SSF.is_date(fmt);
  } catch {
    return false;
  }
}

export function excelSerialToDate(serial: number): { iso: string; y: number; m: number; d: number } | null {
  const p = XLSX.SSF.parse_date_code(serial);
  if (!p || !p.y || !p.m || !p.d) return null;
  const iso = `${String(p.y).padStart(4, "0")}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
  return { iso, y: p.y, m: p.m, d: p.d };
}
