import type { ServiceSection, ServiceCenterRecord, ValidationIssue, CellValue } from "../types";
import type { ServiceSheetConfig } from "../config/sheets";
import { type Grid } from "./grid";
import { colIndex, cellText, a1, collapse } from "./cells";

export interface ParseServiceResult {
  sections: ServiceSection[];
  issues: ValidationIssue[];
}

export function parseServiceSheet(grid: Grid, cfg: ServiceSheetConfig): ParseServiceResult {
  const sections: ServiceSection[] = [];
  const issues: ValidationIssue[] = [];

  const serialColIdx = colIndex(cfg.serialCol);
  const textColIdx = colIndex(cfg.textCol);

  let currentSection: ServiceSection | null = null;

  for (let r = 1; r <= grid.maxRow; r++) {
    const sRaw = grid.get(serialColIdx, r);
    const tRaw = grid.get(textColIdx, r);
    const sStr = cellText(sRaw);
    const tStr = cellText(tRaw);

    if (!sStr && !tStr) continue;

    // Check if brand section header:
    // Serial is empty, text has brand name (e.g. "INFINIX", "SAMSUNG", "XIAOMI", "OPPO", etc.)
    const isSectionHeader = !sStr && tStr && (tStr.length < 35 || /service\s*center/i.test(tStr));

    if (isSectionHeader && tStr) {
      const brand = tStr.trim();
      currentSection = {
        brand: brand.replace(/\s*service\s*center/i, "").trim() || brand,
        brand_raw: tStr,
        brand_note: null,
        header_row: r,
        centers: [],
        notes: [],
      };
      sections.push(currentSection);
      continue;
    }

    if (!currentSection) {
      currentSection = {
        brand: "General / Other",
        brand_raw: "General / Other",
        brand_note: null,
        header_row: r,
        centers: [],
        notes: [],
      };
      sections.push(currentSection);
    }

    if (tStr) {
      // Extract phone numbers: Indian landline (0141-xxx) or mobile (98xxx, +91xxx)
      const phoneRegex = /(?:\+?91[\s-]?)?[6-9]\d{9}|0\d{2,4}[-\s]?\d{6,8}/g;
      const phones = Array.from(new Set(tStr.match(phoneRegex) || [])).map((p) => p.replace(/\s+/g, ""));

      // Clean address / center name:
      // Try to separate name (before first comma/address marker) and address
      const parts = tStr.split(/[-–,]\s*(?:NEAR|OPP|BEHIND|ROAD|PLOT|SHOP|SECTOR|JAIPUR|NEARBY)/i);
      const centerName = parts.length > 1 ? parts[0].trim() : tStr.slice(0, 50).trim();

      const sourceCells: Record<string, CellValue> = {
        [a1(cfg.textCol, r)]: tRaw,
      };
      if (sRaw !== null) sourceCells[a1(cfg.serialCol, r)] = sRaw;

      const record: ServiceCenterRecord = {
        id: `${grid.name}|ROW|${r}`,
        source_sheet: grid.name,
        source_row: r,
        source_cells: sourceCells,
        brand: currentSection.brand,
        brand_raw: currentSection.brand_raw,
        brand_note: null,
        serial_raw: sRaw,
        text_raw: tStr,
        center_name: collapse(centerName) ?? centerName,
        address: collapse(tStr) ?? tStr,
        phones,
      };

      currentSection.centers.push(record);
    }
  }

  return { sections, issues };
}
