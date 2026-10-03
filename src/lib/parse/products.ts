import type {
  ProductRecord,
  ProductCategory,
  ValidationIssue,
  CellValue,
  CustomField,
  PriceStatus,
  OfferHighlight,
} from "../types";
import type { ProductSheetConfig, ProductField } from "../config/sheets";
import { type Grid } from "./grid";
import { colLetter, colIndex, cellText, isBlank, normKey, hash, a1, collapse } from "./cells";
import { parsePrice } from "./price";
import { parseVariant } from "./variant";
import { extractHighlights, detectTags } from "./offers";

export interface ParseProductsResult {
  products: ProductRecord[];
  issues: ValidationIssue[];
  headers: Record<string, string>;
  mapping: Record<string, string>;
  nonBlankCells: number;
}

export function parseProductSheet(
  grid: Grid,
  cfg: ProductSheetConfig,
  sourceWorkbook: string,
  timestamp: string,
  syncVersion: number
): ParseProductsResult {
  const issues: ValidationIssue[] = [];
  const products: ProductRecord[] = [];
  const headers: Record<string, string> = {};
  const mapping: Record<string, string> = {};

  // 1. Resolve columns from header row
  const resolvedCols: Partial<Record<ProductField, number>> = {};
  const headerRow = cfg.headerRow;

  if (headerRow !== null && headerRow > 0 && headerRow <= grid.maxRow) {
    // Record all non-blank headers
    for (let c = 0; c <= grid.maxCol; c++) {
      const t = cellText(grid.get(c, headerRow));
      if (t) {
        headers[colLetter(c)] = t;
      }
    }

    // Map each configured field
    const fieldEntries = Object.entries(cfg.columns) as [ProductField, { col: string; headers?: string[]; required?: boolean }][];
    for (const [field, spec] of fieldEntries) {
      let foundCol: number | null = null;
      if (spec.headers && spec.headers.length > 0) {
        for (let c = 0; c <= grid.maxCol; c++) {
          const hText = headers[colLetter(c)];
          if (hText) {
            const nh = normKey(hText);
            if (spec.headers.some((alias) => normKey(alias) === nh)) {
              foundCol = c;
              break;
            }
          }
        }
      }

      const defaultColIdx = colIndex(spec.col);
      if (foundCol !== null) {
        resolvedCols[field] = foundCol;
        mapping[field] = colLetter(foundCol);
        if (foundCol !== defaultColIdx) {
          issues.push({
            level: "info",
            code: "COLUMN_MOVED",
            sheet: grid.name,
            message: `Field "${field}" moved from default ${spec.col} to ${colLetter(foundCol)} based on header "${headers[colLetter(foundCol)]}".`,
          });
        }
      } else {
        // Fallback to default column
        const defaultHeaderText = headers[spec.col];
        if (defaultHeaderText) {
          // If default column has an unrecognized non-blank header and field was required
          if (spec.required) {
            issues.push({
              level: "error",
              code: "STRUCTURE_CHANGED",
              sheet: grid.name,
              blocking: true,
              message: `Required field "${field}" header not found, and default column ${spec.col} has header "${defaultHeaderText}".`,
            });
          }
        }
        resolvedCols[field] = defaultColIdx;
        mapping[field] = spec.col;
      }
    }

    // Check for unmapped columns with headers
    for (const [col, hText] of Object.entries(headers)) {
      if (!Object.values(mapping).includes(col)) {
        issues.push({
          level: "info",
          code: "NEW_COLUMN",
          sheet: grid.name,
          message: `Unmapped column ${col} with header "${hText}" discovered. Kept in custom fields.`,
        });
      }
    }
  } else {
    // No header row
    const fieldEntries = Object.entries(cfg.columns) as [ProductField, { col: string }][];
    for (const [field, spec] of fieldEntries) {
      const idx = colIndex(spec.col);
      resolvedCols[field] = idx;
      mapping[field] = spec.col;
    }
  }

  const modelCol = resolvedCols.model ?? 0;
  const priceCol = resolvedCols.price ?? 1;
  const offerPriceCol = resolvedCols.offer_price;
  const offerTextCol = resolvedCols.offer_text;
  const cardOfferCol = resolvedCols.card_offer;
  const cashbackCol = resolvedCols.cashback;

  const startRow = (headerRow ?? 0) + 1;
  let currentSection: string | null = null;
  let currentCategory: ProductCategory = cfg.defaultCategory ?? "Phone";
  let activeBrand: string = cfg.brand;

  let lastProduct: ProductRecord | null = null;

  for (let r = startRow; r <= grid.maxRow; r++) {
    const rCells = grid.rowCells(r);
    if (rCells.length === 0) continue;

    // Check if row is a section header (e.g. "INFINIX", "TECNO", "TABLET")
    // Typically 1 non-empty cell in the model col (or col 0) and no price
    const modelRaw = grid.get(modelCol, r);
    const priceRaw = grid.get(priceCol, r);
    const modelStr = cellText(modelRaw);
    const priceStr = cellText(priceRaw);

    const isSectionHeader =
      modelStr &&
      !priceStr &&
      rCells.length <= 2 &&
      (modelStr.length < 25 || /^(TABLET|PHONE|SMARTPHONE|FEATURE PHONE|ACCESSORIES|MOBILE|BRAND)/i.test(modelStr)) &&
      !/\d+\s*(\/|\+|\*|GB|RAM|ROM|MP)/i.test(modelStr);

    if (isSectionHeader && modelStr) {
      const trimmed = modelStr.trim();
      currentSection = trimmed;
      if (cfg.sections === "brand") {
        activeBrand = trimmed;
      } else if (cfg.sections === "category" || /tablet/i.test(trimmed)) {
        if (/tablet/i.test(trimmed)) currentCategory = "Tablet";
        else if (/phone|mobile/i.test(trimmed)) currentCategory = "Phone";
      }
      continue;
    }

    // Check vertical merge continuation into model column
    const anchor = grid.mergeAnchor(modelCol, r);
    if (anchor && anchor.row < r && lastProduct && lastProduct.source_rows.includes(anchor.row)) {
      // Continuation row
      lastProduct.source_rows.push(r);
      for (const c of rCells) {
        lastProduct.source_cells[a1(c.letter, r)] = c.raw;
      }
      continue;
    }

    // If model is blank but other mapped cells have data: orphan cell
    if (!modelStr) {
      if (rCells.length > 0) {
        issues.push({
          level: "warning",
          code: "ORPHAN_ROW",
          sheet: grid.name,
          row: r,
          message: `Row ${r} has values in columns ${rCells.map((c) => c.letter).join(",")} but model is blank.`,
        });
      }
      continue;
    }

    // Check if row is styled in red (meaning Out of Stock in Excel / Google Sheets)
    const isRowRed = grid.isRowRed(r);

    // Extract price
    const parsedP = parsePrice(priceRaw);
    let mopVal: number | null = parsedP.value;
    let mopStatus: PriceStatus = parsedP.status;
    let mopSource: "price_column" | "model_text" | null = "price_column";

    // If price cell is missing, check if model text has embedded price
    if (mopStatus === "missing" || mopVal === null) {
      const embeddedMatch = modelStr.match(/(\d{4,6})\s*\/?-?\s*(FIX|FIXED)?$/i);
      if (embeddedMatch) {
        const num = parseInt(embeddedMatch[1], 10);
        if (num >= 500 && num <= 300000) {
          mopVal = num;
          mopStatus = "parsed";
          mopSource = "model_text";
        }
      }
    }

    // Extract variant
    const variantInfo = parseVariant(modelStr);
    const modelBase = variantInfo.model_base || modelStr;
    const groupKey = `${normKey(activeBrand)}|${normKey(modelBase)}`;

    // Offer price
    let offerPriceVal: number | null = null;
    let offerPriceRaw: CellValue = null;
    let offerPriceSource: "offer_price_column" | "mop_cell" | null = null;
    let offerDateText: string | null = parsedP.offer_date_text;

    if (offerPriceCol !== undefined) {
      offerPriceRaw = grid.get(offerPriceCol, r);
      if (typeof offerPriceRaw === "number") {
        offerPriceVal = Math.round(offerPriceRaw);
        offerPriceSource = "offer_price_column";
      } else if (typeof offerPriceRaw === "string" && !isBlank(offerPriceRaw)) {
        const opParsed = parsePrice(offerPriceRaw);
        if (opParsed.value !== null) {
          offerPriceVal = opParsed.value;
          offerPriceSource = "offer_price_column";
        }
      }
    }

    if (offerPriceVal === null && parsedP.offer_value !== null) {
      offerPriceVal = parsedP.offer_value;
      offerPriceSource = "mop_cell";
    }

    // Offer texts
    const offerTextRaw = offerTextCol !== undefined ? grid.get(offerTextCol, r) : null;
    const cardOfferRaw = cardOfferCol !== undefined ? grid.get(cardOfferCol, r) : null;
    const cashbackRaw = cashbackCol !== undefined ? grid.get(cashbackCol, r) : null;

    const offerText = cellText(offerTextRaw);
    const cardOffer = cellText(cardOfferRaw);
    const cashback = cellText(cashbackRaw);

    // Collect source cells for this row
    const sourceCells: Record<string, CellValue> = {};
    for (const c of rCells) {
      sourceCells[a1(c.letter, r)] = c.raw;
    }

    // Unmapped / custom fields
    const mappedColsSet = new Set(Object.values(resolvedCols));
    const customFields: CustomField[] = [];
    for (const c of rCells) {
      if (!mappedColsSet.has(c.col)) {
        customFields.push({
          column: c.letter,
          header: headers[c.letter] ?? null,
          raw: c.raw,
        });
      }
    }

    // Highlights & tags
    const offerHighlights: OfferHighlight[] = [];
    if (offerText) offerHighlights.push(...extractHighlights(offerText, "offer_text"));
    if (cardOffer) offerHighlights.push(...extractHighlights(cardOffer, "card_offer"));
    if (cashback) offerHighlights.push(...extractHighlights(cashback, "cashback"));

    const offerTags = detectTags([offerText, cardOffer, cashback], mopStatus === "parsed" && parsedP.fixed);

    const hasOffer =
      (offerPriceVal !== null && (mopVal === null || offerPriceVal < mopVal)) ||
      Boolean(offerText) ||
      Boolean(cardOffer) ||
      Boolean(cashback) ||
      offerHighlights.length > 0;

    // Price label from header
    const priceLabel = headers[colLetter(priceCol)] ? headers[colLetter(priceCol)].trim() : "MOP";

    // Row warnings
    const rowWarnings: string[] = [];
    if (mopStatus === "text") {
      rowWarnings.push(`Price is text "${priceStr}" – could not be parsed safely.`);
    } else if (mopStatus === "missing") {
      rowWarnings.push("Price cell is empty.");
    }

    if (offerPriceVal !== null && mopVal !== null && offerPriceVal > mopVal) {
      rowWarnings.push(`Offer price (₹${offerPriceVal}) is higher than MOP (₹${mopVal}).`);
      issues.push({
        level: "warning",
        code: "OFFER_EXCEEDS_MOP",
        sheet: grid.name,
        row: r,
        message: `Row ${r} (${modelStr}): offer price ₹${offerPriceVal} > MOP ₹${mopVal}`,
      });
    }

    const recId = `${grid.name}|ROW|${r}`;
    const sortedCellData = Object.entries(sourceCells)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${String(v)}`)
      .join(";");
    const fingerprint = hash(`${recId}|${modelStr}|${mopVal}|${offerPriceVal}|${sortedCellData}`);

    const product: ProductRecord = {
      id: recId,
      source_workbook: sourceWorkbook,
      source_sheet: grid.name,
      source_row: r,
      source_rows: [r],
      source_columns: mapping,
      source_cells: sourceCells,
      sync_version: syncVersion,
      last_synced_at: timestamp,
      first_seen_at: timestamp,
      last_changed_at: timestamp,

      brand: activeBrand,
      brand_raw: cfg.brand,
      section: currentSection,
      section_raw: currentSection,
      category: currentCategory,

      model: collapse(modelStr) ?? modelStr,
      model_raw: modelStr,
      model_base: modelBase,
      group_key: groupKey,
      variant: variantInfo.variant,
      variant_raw: variantInfo.variant_raw,
      ram_gb: variantInfo.ram_gb,
      storage_gb: variantInfo.storage_gb,
      colour: null,

      price_label: priceLabel,
      mop: mopVal,
      mop_raw: priceRaw,
      mop_status: mopStatus,
      mop_source: mopSource,
      mop_note: parsedP.note,
      fixed_price: parsedP.fixed,

      offer_price: offerPriceVal,
      offer_price_raw: offerPriceRaw,
      offer_price_source: offerPriceSource,
      offer_date_text: offerDateText,

      offer_text: collapse(offerText),
      offer_text_raw: offerTextRaw,
      card_offer: collapse(cardOffer),
      card_offer_raw: cardOfferRaw,
      cashback: collapse(cashback),
      cashback_raw: cashbackRaw,

      exchange_offer: null,
      exchange_offer_raw: null,
      bank_offer: null,
      bank_offer_raw: null,
      emi_offer: null,
      emi_offer_raw: null,

      offer_highlights: offerHighlights,
      offer_tags: offerTags,
      has_offer: hasOffer,

      stock_status: isRowRed ? "Out of Stock" : "In Stock",
      notes: isRowRed ? "Marked Red in Sheet (Out of Stock)" : null,
      custom_fields: customFields,
      warnings: rowWarnings,
      fingerprint,
    };

    products.push(product);
    lastProduct = product;
  }

  // Price column sanity check across sheet
  if (products.length >= 5) {
    const withNumericPrice = products.filter((p) => p.mop !== null).length;
    const ratio = withNumericPrice / products.length;
    if (ratio < 0.5) {
      issues.push({
        level: "error",
        code: "STRUCTURE_CHANGED",
        sheet: grid.name,
        blocking: true,
        message: `Only ${withNumericPrice}/${products.length} (${Math.round(ratio * 100)}%) products in sheet "${grid.name}" have numeric prices. Price column may have shifted.`,
      });
    }
  }

  return {
    products,
    issues,
    headers,
    mapping,
    nonBlankCells: grid.nonBlankCount(),
  };
}
