import type { ProductCategory } from "../types";
import { normKey } from "../parse/cells";

/**
 * SOURCE MAPPING CONFIGURATION (generated from the workbook analysis on 03 Oct 2026 – see
 * docs/SOURCE_ANALYSIS.md). Edit this file to remap columns; no other code needs to change.
 *
 * Column resolution rules (protects against inserted / moved columns):
 *  - If `headers` are given and the header row contains one of them, that column is used,
 *    wherever it is now (a column inserted before it does not break the mapping).
 *  - If the header is NOT found but the default column holds a different, non-blank header,
 *    the sheet is reported as "SOURCE STRUCTURE CHANGED" and publication is blocked.
 *  - If the default column has no header (blank), the default column letter is used.
 *
 * Sheet names are matched case/whitespace-insensitively ("VIVO  IQOO" == "VIVO IQOO").
 */

export type ProductField = "model" | "price" | "offer_price" | "offer_text" | "card_offer" | "cashback";

export interface ColumnSpec {
  col: string;
  headers?: string[];
  /** Header must exist (sheet has a header row with this column named). */
  required?: boolean;
}

export interface ProductSheetConfig {
  kind: "products";
  sheet: string;
  brand: string;
  /** 1-based header row, or null when the sheet has no header row */
  headerRow: number | null;
  columns: Partial<Record<ProductField, ColumnSpec>> & { model: ColumnSpec; price: ColumnSpec };
  /** Section-header rows ("INFINIX", "TECNO", "TABLET") – are they brands or categories? */
  sections?: "brand" | "category";
  defaultCategory?: ProductCategory;
}

export interface AccessoriesSheetConfig {
  kind: "accessories";
  sheet: string;
  label: string;
  /** side-by-side blocks: name column (+ optional separate price column) */
  blocks: { name: string; price?: string }[];
}

export interface ServiceSheetConfig {
  kind: "service_centers";
  sheet: string;
  serialCol: string;
  textCol: string;
}

export interface CalendarSheetConfig {
  kind: "calendar";
  sheet: string;
  dateCol: string;
  textCol: string;
}

export type SheetConfig = ProductSheetConfig | AccessoriesSheetConfig | ServiceSheetConfig | CalendarSheetConfig;

const MODEL_H = ["MODEL", "PRODUCT", "MODEL NAME"];
const MOP_H = ["MOP"];
const PRICE_H = ["PRICE"];

export const SHEET_CONFIGS: SheetConfig[] = [
  {
    kind: "products",
    sheet: "MI",
    brand: "Xiaomi / Redmi / Poco",
    headerRow: 1,
    columns: {
      model: { col: "A", headers: MODEL_H },
      price: { col: "B", headers: MOP_H, required: true },
      offer_text: { col: "C", headers: ["OFFER"] },
      cashback: { col: "E", headers: ["CASHBACK"] },
    },
    defaultCategory: "Phone",
  },
  {
    kind: "products",
    sheet: "GOOGLE",
    brand: "Google Pixel",
    headerRow: 1,
    columns: {
      model: { col: "A", headers: MODEL_H },
      price: { col: "B", headers: MOP_H, required: true },
      offer_price: { col: "C", headers: ["OFFER PRICE"] },
      card_offer: { col: "D", headers: ["CARD OFFER"] },
    },
    defaultCategory: "Phone",
  },
  {
    kind: "products",
    sheet: "SAMSUNG",
    brand: "Samsung",
    headerRow: 1,
    columns: {
      model: { col: "A", headers: MODEL_H },
      // MOP cell may contain "15999/-   15499/- OFFER 28 SEPT" – handled by the price grammar.
      price: { col: "B", headers: MOP_H, required: true },
      offer_text: { col: "D", headers: ["OFFER"] },
    },
    defaultCategory: "Phone",
  },
  {
    kind: "products",
    sheet: "OPPO",
    brand: "Oppo",
    headerRow: 1,
    columns: {
      model: { col: "A", headers: MODEL_H },
      price: { col: "B", headers: MOP_H, required: true },
      card_offer: { col: "C", headers: ["CARD OFFER"] },
    },
    defaultCategory: "Phone",
  },
  {
    kind: "products",
    sheet: "REALME",
    brand: "Realme",
    headerRow: 1,
    columns: {
      model: { col: "A", headers: MODEL_H },
      price: { col: "B", headers: MOP_H, required: true },
      // Header says OFFER PRICE but cells hold offer TEXT – numeric cells become offer_price,
      // text cells are kept as offer text (see products.ts).
      offer_price: { col: "C", headers: ["OFFER PRICE"] },
    },
    defaultCategory: "Phone",
  },
  {
    kind: "products",
    sheet: "MOTOROLA",
    brand: "Motorola",
    headerRow: null,
    columns: {
      model: { col: "A" },
      price: { col: "B" },
      offer_text: { col: "C" },
    },
    sections: "category",
    defaultCategory: "Phone",
  },
  {
    kind: "products",
    sheet: "VIVO IQOO",
    brand: "Vivo / iQOO",
    headerRow: 1,
    columns: {
      model: { col: "A", headers: MODEL_H },
      price: { col: "B", headers: MOP_H, required: true },
      cashback: { col: "C", headers: ["CASHBACK OFFER", "CASHBACK"] },
    },
    defaultCategory: "Phone",
  },
  {
    kind: "products",
    sheet: "LENOVO",
    brand: "Lenovo",
    headerRow: null,
    columns: {
      model: { col: "A" },
      price: { col: "B" },
    },
    defaultCategory: "Tablet",
  },
  {
    kind: "products",
    sheet: "NOKIA",
    brand: "Nokia / HMD",
    headerRow: 1,
    columns: {
      model: { col: "A", headers: MODEL_H },
      price: { col: "B", headers: MOP_H, required: true },
    },
    defaultCategory: "Phone",
  },
  {
    kind: "products",
    sheet: "APPLE",
    brand: "Apple",
    headerRow: 1,
    columns: {
      model: { col: "A", headers: MODEL_H },
      price: { col: "B", headers: PRICE_H, required: true },
      cashback: { col: "C", headers: ["CASHBACK"] },
    },
    defaultCategory: "Phone",
  },
  {
    kind: "products",
    sheet: "INFINIX TECNO",
    brand: "Infinix / Tecno",
    headerRow: 1,
    columns: {
      model: { col: "A", headers: MODEL_H },
      price: { col: "B", headers: MOP_H, required: true },
      offer_text: { col: "C", headers: ["OFFER", "CARD OFFER"] },
    },
    sections: "brand",
    defaultCategory: "Phone",
  },
  {
    kind: "products",
    sheet: "NOTHING",
    brand: "Nothing",
    headerRow: null,
    columns: {
      model: { col: "A" },
      price: { col: "B" },
      offer_text: { col: "C" },
    },
    defaultCategory: "Phone",
  },
  {
    kind: "products",
    sheet: "ONEPLUS",
    brand: "OnePlus",
    headerRow: 1,
    columns: {
      model: { col: "A", headers: MODEL_H },
      price: { col: "B", headers: PRICE_H, required: true },
    },
    defaultCategory: "Phone",
  },
  { kind: "accessories", sheet: "ACCESSORIES", label: "Accessories", blocks: [{ name: "A" }, { name: "E", price: "F" }] },
  { kind: "accessories", sheet: "ACC. 2", label: "Screen guards & lamination", blocks: [{ name: "A" }] },
  { kind: "service_centers", sheet: "SERVICE CENTER", serialCol: "A", textCol: "B" },
  { kind: "calendar", sheet: "NO WEEK OFF CALENDER", dateCol: "A", textCol: "B" },
];

export function findConfig(sheetName: string): SheetConfig | undefined {
  const k = normKey(sheetName);
  return SHEET_CONFIGS.find((c) => normKey(c.sheet) === k);
}

/** Sheets that are expected to exist (a missing one blocks publication). */
export function expectedSheets(): string[] {
  return SHEET_CONFIGS.map((c) => c.sheet);
}
