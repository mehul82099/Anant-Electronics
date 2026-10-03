import * as XLSX from "xlsx";
import type {
  Dataset,
  ProductRecord,
  AccessoryRecord,
  ServiceSection,
  CalendarModule,
  ValidationIssue,
  SheetReport,
  SourceInfo,
} from "../types";
import { SCHEMA_VERSION } from "../types";
import { SHEET_CONFIGS, findConfig, expectedSheets } from "../config/sheets";
import { makeGrid, readWorkbook } from "./grid";
import { parseProductSheet } from "./products";
import { parseAccessoriesSheet } from "./accessories";
import { parseServiceSheet } from "./service";
import { parseCalendarSheet } from "./calendar";
import { normKey, hash } from "./cells";

export interface ParseWorkbookOptions {
  buffer: ArrayBuffer | Uint8Array;
  sourceInfo: SourceInfo;
  syncVersion?: number;
}

export function parseWorkbook({ buffer, sourceInfo, syncVersion = 1 }: ParseWorkbookOptions): Dataset {
  const wb = readWorkbook(buffer);
  const now = new Date().toISOString();

  const allProducts: ProductRecord[] = [];
  const allAccessories: AccessoryRecord[] = [];
  let allServiceCenters: ServiceSection[] = [];
  let calendarModule: CalendarModule | null = null;
  const allIssues: ValidationIssue[] = [];
  const sheetReports: SheetReport[] = [];

  const foundSheetKeys = new Set(wb.SheetNames.map((n) => normKey(n)));

  // Check expected sheets
  for (const exp of expectedSheets()) {
    if (!foundSheetKeys.has(normKey(exp))) {
      allIssues.push({
        level: "warning",
        code: "MISSING_SHEET",
        sheet: exp,
        message: `Expected sheet "${exp}" was not found in the workbook.`,
      });
    }
  }

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const grid = makeGrid(sheetName, ws);
    const nonBlankCount = grid.nonBlankCount();
    const cfg = findConfig(sheetName);

    if (!cfg) {
      // Unconfigured sheet
      if (nonBlankCount === 0) {
        // e.g. Sheet100
        sheetReports.push({
          name: sheetName,
          kind: "blank",
          configured: false,
          visible: false,
          ref: grid.ref,
          non_blank_cells: 0,
          record_count: 0,
          headers: {},
          mapping: {},
          status: "hidden",
        });
        continue;
      }

      // Check if it looks like a products sheet
      let looksLikeProducts = false;
      for (let r = 1; r <= Math.min(5, grid.maxRow); r++) {
        const text = grid.rowCells(r).map((c) => String(c.raw).toUpperCase()).join(" ");
        if (/MODEL|PRICE|MOP/.test(text)) {
          looksLikeProducts = true;
          break;
        }
      }

      if (looksLikeProducts) {
        allIssues.push({
          level: "info",
          code: "NEW_SHEET_AUTODETECTED",
          sheet: sheetName,
          message: `Sheet "${sheetName}" was auto-detected as a product category.`,
        });
        const autoResult = parseProductSheet(
          grid,
          {
            kind: "products",
            sheet: sheetName,
            brand: sheetName,
            headerRow: 1,
            columns: {
              model: { col: "A" },
              price: { col: "B" },
            },
            defaultCategory: "Phone",
          },
          sourceInfo.workbook_name,
          now,
          syncVersion
        );
        allProducts.push(...autoResult.products);
        allIssues.push(...autoResult.issues);
        sheetReports.push({
          name: sheetName,
          kind: "products",
          configured: false,
          visible: true,
          ref: grid.ref,
          non_blank_cells: nonBlankCount,
          record_count: autoResult.products.length,
          headers: autoResult.headers,
          mapping: autoResult.mapping,
          status: "review",
        });
      } else {
        allIssues.push({
          level: "warning",
          code: "NEW_SHEET_UNRECOGNIZED",
          sheet: sheetName,
          message: `Sheet "${sheetName}" has ${nonBlankCount} cells but unrecognized format.`,
        });
        sheetReports.push({
          name: sheetName,
          kind: "unknown",
          configured: false,
          visible: false,
          ref: grid.ref,
          non_blank_cells: nonBlankCount,
          record_count: 0,
          headers: {},
          mapping: {},
          status: "review",
        });
      }
      continue;
    }

    // Configured sheet
    if (cfg.kind === "products") {
      const res = parseProductSheet(grid, cfg, sourceInfo.workbook_name, now, syncVersion);
      allProducts.push(...res.products);
      allIssues.push(...res.issues);

      const hasBlocking = res.issues.some((i) => i.blocking);
      sheetReports.push({
        name: sheetName,
        kind: "products",
        configured: true,
        visible: true,
        ref: grid.ref,
        non_blank_cells: nonBlankCount,
        record_count: res.products.length,
        headers: res.headers,
        mapping: res.mapping,
        status: hasBlocking ? "error" : res.issues.length ? "warning" : "ok",
      });
    } else if (cfg.kind === "accessories") {
      const res = parseAccessoriesSheet(grid, cfg);
      allAccessories.push(...res.accessories);
      allIssues.push(...res.issues);

      sheetReports.push({
        name: sheetName,
        kind: "accessories",
        configured: true,
        visible: true,
        ref: grid.ref,
        non_blank_cells: nonBlankCount,
        record_count: res.accessories.length,
        headers: {},
        mapping: {},
        status: res.issues.length ? "warning" : "ok",
      });
    } else if (cfg.kind === "service_centers") {
      const res = parseServiceSheet(grid, cfg);
      allServiceCenters = res.sections;
      allIssues.push(...res.issues);

      const count = res.sections.reduce((acc, s) => acc + s.centers.length, 0);
      sheetReports.push({
        name: sheetName,
        kind: "service_centers",
        configured: true,
        visible: true,
        ref: grid.ref,
        non_blank_cells: nonBlankCount,
        record_count: count,
        headers: {},
        mapping: {},
        status: res.issues.length ? "warning" : "ok",
      });
    } else if (cfg.kind === "calendar") {
      const res = parseCalendarSheet(grid, cfg);
      calendarModule = res.calendar;
      allIssues.push(...res.issues);

      sheetReports.push({
        name: sheetName,
        kind: "calendar",
        configured: true,
        visible: true,
        ref: grid.ref,
        non_blank_cells: nonBlankCount,
        record_count: res.calendar?.entries.length ?? 0,
        headers: {},
        mapping: {},
        status: res.issues.length ? "warning" : "ok",
      });
    }
  }

  // Check duplicate models
  const modelSeen: Record<string, ProductRecord[]> = {};
  for (const p of allProducts) {
    const key = `${p.brand}|${normKey(p.model)}`;
    if (!modelSeen[key]) modelSeen[key] = [];
    modelSeen[key].push(p);
  }

  for (const [key, list] of Object.entries(modelSeen)) {
    if (list.length > 1) {
      allIssues.push({
        level: "warning",
        code: "DUPLICATE_MODEL",
        sheet: list[0].source_sheet,
        message: `Model "${list[0].model}" appears ${list.length} times in brand ${list[0].brand} (rows: ${list.map((x) => x.source_row).join(", ")}).`,
      });
    }
  }

  return {
    schema_version: SCHEMA_VERSION,
    version: syncVersion,
    created_at: now,
    source: sourceInfo,
    sheets: sheetReports,
    products: allProducts,
    accessories: allAccessories,
    service_centers: allServiceCenters,
    calendar: calendarModule,
    removed: [],
    validation: allIssues,
    changes: null,
  };
}
