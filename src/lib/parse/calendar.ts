import type { CalendarModule, CalendarEntry, ValidationIssue } from "../types";
import type { CalendarSheetConfig } from "../config/sheets";
import { type Grid, isDateFormat, excelSerialToDate } from "./grid";
import { colIndex, cellText, collapse } from "./cells";

export interface ParseCalendarResult {
  calendar: CalendarModule | null;
  issues: ValidationIssue[];
}

export function parseCalendarSheet(grid: Grid, cfg: CalendarSheetConfig): ParseCalendarResult {
  const issues: ValidationIssue[] = [];
  const entries: CalendarEntry[] = [];

  const dateColIdx = colIndex(cfg.dateCol);
  const textColIdx = colIndex(cfg.textCol);

  let title: string | null = null;

  for (let r = 1; r <= grid.maxRow; r++) {
    const dRaw = grid.get(dateColIdx, r);
    const tRaw = grid.get(textColIdx, r);
    const dStr = cellText(dRaw);
    const tStr = cellText(tRaw);

    if (!dStr && !tStr) continue;

    // First row or title row
    if (r === 1 && !tStr && dStr) {
      title = dStr;
      continue;
    }

    let dateDisplay: string | null = null;
    let dateIso: string | null = null;

    if (typeof dRaw === "number") {
      const parsedDate = excelSerialToDate(dRaw);
      if (parsedDate) {
        dateIso = parsedDate.iso;
        dateDisplay = `${parsedDate.d} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parsedDate.m - 1]} ${parsedDate.y}`;
      } else {
        dateDisplay = String(dRaw);
      }
    } else if (dStr) {
      dateDisplay = dStr;
    }

    entries.push({
      source_row: r,
      date_raw: dRaw,
      date_display: dateDisplay,
      date_iso: dateIso,
      text_raw: collapse(tStr) ?? tStr,
      kind: dateDisplay ? "event" : "note",
    });
  }

  return {
    calendar: {
      source_sheet: grid.name,
      title: title ?? "Store Calendar",
      entries,
    },
    issues,
  };
}
