import type { AccessoryRecord, ValidationIssue, CellValue, PriceStatus } from "../types";
import type { AccessoriesSheetConfig } from "../config/sheets";
import { type Grid } from "./grid";
import { colIndex, colLetter, cellText, a1, hash, collapse } from "./cells";
import { parsePrice } from "./price";

export interface ParseAccessoriesResult {
  accessories: AccessoryRecord[];
  issues: ValidationIssue[];
}

export function parseAccessoriesSheet(grid: Grid, cfg: AccessoriesSheetConfig): ParseAccessoriesResult {
  const accessories: AccessoryRecord[] = [];
  const issues: ValidationIssue[] = [];

  for (const block of cfg.blocks) {
    const nameColIdx = colIndex(block.name);
    const priceColIdx = block.price ? colIndex(block.price) : null;
    let currentCategory: string | null = null;

    for (let r = 1; r <= grid.maxRow; r++) {
      const nameRaw = grid.get(nameColIdx, r);
      const nameStr = cellText(nameRaw);
      const priceRaw = priceColIdx !== null ? grid.get(priceColIdx, r) : null;
      const priceStr = cellText(priceRaw);

      if (!nameStr && !priceStr) continue;

      // Detect header / category row:
      // Has name text, no price in separate column, no embedded price digits, and relatively short
      const isHeader =
        nameStr &&
        !priceStr &&
        nameStr.length < 30 &&
        !/\d+\s*(\/|-)/.test(nameStr) &&
        (r === 1 || !cellText(grid.get(nameColIdx, r - 1)));

      if (isHeader && nameStr) {
        currentCategory = nameStr.trim();
        continue;
      }

      if (!nameStr && priceStr) {
        issues.push({
          level: "warning",
          code: "ORPHAN_ACCESSORY_PRICE",
          sheet: grid.name,
          row: r,
          message: `Row ${r} col ${block.price} has price "${priceStr}" with no name in ${block.name}.`,
        });
        continue;
      }

      if (!nameStr) continue;

      // Extract price
      let priceVal: number | null = null;
      let priceStatus: PriceStatus = "missing";
      let priceSource: "price_column" | "name_text" | null = null;
      let cleanName = nameStr;

      if (priceRaw !== null && priceRaw !== undefined) {
        const pParsed = parsePrice(priceRaw);
        priceVal = pParsed.value;
        priceStatus = pParsed.status;
        priceSource = "price_column";
      }

      if (priceVal === null) {
        // Try embedded price in name, e.g. "TEMPERED GLASS 99/-", "CABLE 149/-"
        const m = nameStr.match(/^(.*?)\s*[-:]?\s*(\d{2,6})\s*\/?-?\s*$/);
        if (m) {
          const num = parseInt(m[2], 10);
          if (num > 0 && num < 100000) {
            priceVal = num;
            priceStatus = "parsed";
            priceSource = "name_text";
            cleanName = m[1].trim();
          }
        }
      }

      const recId = `${grid.name}|${block.name}|${r}`;
      const sourceCols = [block.name];
      if (block.price) sourceCols.push(block.price);

      const sourceCells: Record<string, CellValue> = {
        [a1(block.name, r)]: nameRaw,
      };
      if (block.price && priceRaw !== null) {
        sourceCells[a1(block.price, r)] = priceRaw;
      }

      const fp = hash(`${recId}|${cleanName}|${priceVal}`);

      accessories.push({
        id: recId,
        source_sheet: grid.name,
        source_row: r,
        source_columns: sourceCols,
        source_cells: sourceCells,
        category: currentCategory,
        category_raw: currentCategory,
        product_name: collapse(cleanName) ?? cleanName,
        name_raw: nameStr,
        price: priceVal,
        price_raw: priceRaw,
        price_status: priceStatus,
        price_source: priceSource,
        offer_raw: null,
        fingerprint: fp,
      });
    }
  }

  return { accessories, issues };
}
