/**
 * Core data model for Anant Electronics.
 *
 * Three layers (see docs/ARCHITECTURE.md):
 *  1. Source layer      – `source_cells`: exact raw cell values, keyed by A1 address.
 *  2. Normalized layer  – the typed fields below (mop, offer_price, ram_gb …).
 *  3. Presentation      – computed in the UI from the normalized layer.
 *
 * RULE: every normalized value keeps its raw counterpart (`*_raw`). Missing values are
 * `null` – never 0, never inherited from a neighbouring row.
 */

export const SCHEMA_VERSION = "1.0";

export type CellValue = string | number | boolean | null;

export type SheetKind = "products" | "accessories" | "service_centers" | "calendar" | "blank" | "unknown";

export type ProductCategory = "Phone" | "Tablet" | "TV" | "Watch" | "Audio" | "Other";

export type PriceStatus =
  | "number" // the cell is a plain number
  | "parsed" // text that was deterministically parsed (e.g. "18999/-", "13000 FIX")
  | "text" // text that could NOT be safely parsed – show raw text, never guess
  | "missing"; // blank / whitespace-only

export interface ParsedPrice {
  status: PriceStatus;
  /** Regular price (MOP / PRICE). null unless deterministic. */
  value: number | null;
  /** Offer price embedded in the same cell (Samsung "15999/- 15499/- OFFER 28 SEPT"). */
  offer_value: number | null;
  /** Offer date text exactly as written ("28 SEPT"). Year is never invented. */
  offer_date_text: string | null;
  /** "FIX" etc. */
  note: string | null;
  fixed: boolean;
  raw: CellValue;
}

export type OfferKind = "UPI" | "Upgrade" | "Instant discount" | "Instant cashback" | "Bank offer" | "EMI";

/** A structured highlight extracted from an offer text ONLY when the grammar is unambiguous. */
export interface OfferHighlight {
  /** Which field of the record the text came from. */
  field: OfferField;
  kind: OfferKind;
  amount: number | null;
  percent: number | null;
  upto: number | null;
  /** The exact source segment the highlight was extracted from. */
  segment: string;
}

export type OfferField = "offer_text" | "card_offer" | "cashback";

export type OfferTag = "Bank Offer" | "Cashback" | "EMI" | "Exchange / Upgrade" | "UPI" | "Special Price" | "Old MRP Stock";

export interface CustomField {
  column: string;
  header: string | null;
  raw: CellValue;
}

export interface ProductRecord {
  /** Stable identity: `${sheet}|ROW|${row}` */
  id: string;
  source_workbook: string;
  source_sheet: string;
  source_row: number;
  /** Includes merged continuation rows (e.g. MI B55:B56). */
  source_rows: number[];
  /** field -> column letter actually used for this record */
  source_columns: Record<string, string>;
  /** A1 -> raw value, for every non-blank cell on the record's rows. */
  source_cells: Record<string, CellValue>;
  sync_version: number;
  last_synced_at: string;
  first_seen_at: string;
  last_changed_at: string;

  brand: string;
  brand_raw: string;
  section: string | null;
  section_raw: string | null;
  category: ProductCategory;

  model: string;
  model_raw: string;
  /** model text with the RAM/storage variant removed – used only to group variants in the UI */
  model_base: string;
  group_key: string;
  variant: string | null;
  variant_raw: string | null;
  ram_gb: number | null;
  storage_gb: number | null;
  colour: string | null;

  price_label: string; // "MOP" | "PRICE" – exactly as the sheet header says
  mop: number | null;
  mop_raw: CellValue;
  mop_status: PriceStatus;
  /** where the price came from: the price column, or text embedded in the model cell */
  mop_source: "price_column" | "model_text" | null;
  mop_note: string | null;
  fixed_price: boolean;

  offer_price: number | null;
  offer_price_raw: CellValue;
  offer_price_source: "offer_price_column" | "mop_cell" | null;
  offer_date_text: string | null;

  offer_text: string | null;
  offer_text_raw: CellValue;
  card_offer: string | null;
  card_offer_raw: CellValue;
  cashback: string | null;
  cashback_raw: CellValue;
  /** No current sheet has dedicated columns for these; kept for schema completeness. */
  exchange_offer: string | null;
  exchange_offer_raw: CellValue;
  bank_offer: string | null;
  bank_offer_raw: CellValue;
  emi_offer: string | null;
  emi_offer_raw: CellValue;

  offer_highlights: OfferHighlight[];
  offer_tags: OfferTag[];
  has_offer: boolean;

  stock_status: string | null;
  notes: string | null;
  custom_fields: CustomField[];
  warnings: string[];
  /** hash of every raw value of the record – used for change detection */
  fingerprint: string;
}

export interface AccessoryRecord {
  /** `${sheet}|${column}|${row}` – side-by-side layouts need the column too */
  id: string;
  source_sheet: string;
  source_row: number;
  source_columns: string[];
  source_cells: Record<string, CellValue>;
  category: string | null;
  category_raw: string | null;
  product_name: string;
  name_raw: string;
  price: number | null;
  price_raw: CellValue;
  price_status: PriceStatus;
  price_source: "price_column" | "name_text" | null;
  offer_raw: CellValue;
  fingerprint: string;
}

export interface ServiceCenterRecord {
  id: string; // `${sheet}|ROW|${row}`
  source_sheet: string;
  source_row: number;
  source_cells: Record<string, CellValue>;
  brand: string;
  brand_raw: string;
  brand_note: string | null;
  serial_raw: CellValue;
  text_raw: string;
  center_name: string | null;
  address: string | null;
  phones: string[];
}

export interface ServiceSection {
  brand: string;
  brand_raw: string;
  brand_note: string | null;
  header_row: number;
  centers: ServiceCenterRecord[];
  /** cells inside the section that are not a center row (e.g. SERVICE CENTER!C90) */
  notes: { cell: string; raw: CellValue }[];
}

export interface CalendarEntry {
  source_row: number;
  date_raw: CellValue;
  date_display: string | null;
  date_iso: string | null;
  text_raw: string | null;
  kind: "event" | "note";
}

export interface CalendarModule {
  source_sheet: string;
  title: string | null;
  entries: CalendarEntry[];
}

export type IssueLevel = "error" | "warning" | "info";

export interface ValidationIssue {
  level: IssueLevel;
  code: string;
  message: string;
  sheet?: string;
  row?: number;
  cell?: string;
  /** Blocking issues stop publication; the previous verified dataset stays live. */
  blocking?: boolean;
}

export interface SheetReport {
  name: string;
  kind: SheetKind;
  configured: boolean;
  visible: boolean;
  ref: string | null;
  non_blank_cells: number;
  record_count: number;
  headers: Record<string, string>;
  mapping: Record<string, string>;
  status: "ok" | "warning" | "error" | "hidden" | "review";
}

export interface ChangeItem {
  id: string;
  sheet: string;
  row: number;
  model: string;
  type: "added" | "removed" | "price" | "offer" | "model" | "other" | "moved";
  field?: string;
  old?: CellValue;
  new?: CellValue;
}

export interface ChangeSummary {
  records_checked: number;
  new_records: number;
  updated_records: number;
  removed_records: number;
  price_changes: number;
  offer_changes: number;
  items: ChangeItem[];
}

export interface RemovedRecord {
  removed_at: string;
  removed_in_version: number;
  record: ProductRecord;
}

export interface SourceInfo {
  kind: string;
  label: string;
  workbook_name: string;
  fetched_at: string;
  bytes: number;
  sha256: string;
}

export interface Dataset {
  schema_version: string;
  version: number;
  created_at: string;
  source: SourceInfo;
  sheets: SheetReport[];
  products: ProductRecord[];
  accessories: AccessoryRecord[];
  service_centers: ServiceSection[];
  calendar: CalendarModule | null;
  removed: RemovedRecord[];
  validation: ValidationIssue[];
  changes: ChangeSummary | null;
}

export interface SyncHistoryEntry {
  id: string;
  started_at: string;
  finished_at: string;
  trigger: "schedule" | "manual" | "cron" | "startup" | "cli";
  status: "success" | "no_change" | "failed" | "blocked";
  version: number | null;
  message: string;
  stats: {
    records_checked: number;
    new_records: number;
    updated_records: number;
    removed_records: number;
    price_changes: number;
    offer_changes: number;
    warnings: number;
    errors: number;
  } | null;
  changes?: ChangeItem[];
  issues?: ValidationIssue[];
}

export interface SyncStatus {
  current_version: number | null;
  last_attempt_at: string | null;
  last_attempt_status: SyncHistoryEntry["status"] | null;
  last_success_at: string | null;
  last_error: string | null;
  interval_minutes: number;
  next_run_at: string | null;
  running: boolean;
}

export interface AppSettings {
  /** 0 = manual only */
  sync_interval_minutes: number;
  /** % change of a price that produces a "suspicious change" warning */
  suspicious_price_change_pct: number;
  /** Block publish if a sheet loses more than this % of its records in one sync */
  mass_removal_block_pct: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  sync_interval_minutes: 5,
  suspicious_price_change_pct: 40,
  mass_removal_block_pct: 50,
};
