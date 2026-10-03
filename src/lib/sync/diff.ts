import type {
  Dataset,
  ProductRecord,
  ChangeSummary,
  ChangeItem,
  RemovedRecord,
  ValidationIssue,
  AppSettings,
} from "../types";
import { DEFAULT_SETTINGS } from "../types";

export interface DiffResult {
  dataset: Dataset;
  changes: ChangeSummary;
  issues: ValidationIssue[];
  blocking: boolean;
}

export function computeDiffAndIntegrate(
  current: Dataset,
  previous: Dataset | null,
  settings: AppSettings = DEFAULT_SETTINGS
): DiffResult {
  const issues: ValidationIssue[] = [];
  const items: ChangeItem[] = [];
  let newRecords = 0;
  let updatedRecords = 0;
  let removedRecords = 0;
  let priceChanges = 0;
  let offerChanges = 0;

  const now = new Date().toISOString();
  const nextVersion = previous ? previous.version + 1 : 1;

  if (!previous) {
    // First sync
    const changes: ChangeSummary = {
      records_checked: current.products.length,
      new_records: current.products.length,
      updated_records: 0,
      removed_records: 0,
      price_changes: 0,
      offer_changes: 0,
      items: [],
    };
    current.version = 1;
    current.changes = changes;
    return { dataset: current, changes, issues: [], blocking: false };
  }

  const prevById = new Map<string, ProductRecord>();
  for (const p of previous.products) {
    prevById.set(p.id, p);
  }

  const currentIds = new Set<string>();

  // Process current products against previous
  for (const p of current.products) {
    currentIds.add(p.id);
    const old = prevById.get(p.id);

    if (!old) {
      // New product
      newRecords++;
      p.sync_version = nextVersion;
      p.first_seen_at = now;
      p.last_changed_at = now;
      items.push({
        id: p.id,
        sheet: p.source_sheet,
        row: p.source_row,
        model: p.model,
        type: "added",
        new: p.mop,
      });
    } else {
      // Existing product: preserve first_seen_at
      p.first_seen_at = old.first_seen_at;

      // Check if data changed via fingerprint
      if (p.fingerprint !== old.fingerprint) {
        updatedRecords++;
        p.sync_version = nextVersion;
        p.last_changed_at = now;

        // Detect price changes
        if (p.mop !== old.mop || p.offer_price !== old.offer_price) {
          priceChanges++;
          items.push({
            id: p.id,
            sheet: p.source_sheet,
            row: p.source_row,
            model: p.model,
            type: "price",
            field: "mop",
            old: old.mop,
            new: p.mop,
          });

          // Check for suspicious price jump
          if (old.mop !== null && p.mop !== null && old.mop > 0) {
            const pct = Math.abs((p.mop - old.mop) / old.mop) * 100;
            if (pct >= settings.suspicious_price_change_pct) {
              issues.push({
                level: "warning",
                code: "SUSPICIOUS_PRICE_CHANGE",
                sheet: p.source_sheet,
                row: p.source_row,
                message: `Price for "${p.model}" changed by ${Math.round(pct)}% (from ₹${old.mop} to ₹${p.mop}).`,
              });
            }
          }
        }

        // Detect offer changes
        if (
          p.offer_text !== old.offer_text ||
          p.card_offer !== old.card_offer ||
          p.cashback !== old.cashback
        ) {
          offerChanges++;
          items.push({
            id: p.id,
            sheet: p.source_sheet,
            row: p.source_row,
            model: p.model,
            type: "offer",
            field: "offers",
            old: old.offer_text || old.card_offer || old.cashback,
            new: p.offer_text || p.card_offer || p.cashback,
          });
        }
      } else {
        // Unchanged
        p.sync_version = old.sync_version;
        p.last_changed_at = old.last_changed_at;
      }
    }
  }

  // Detect removed products
  const newlyRemoved: RemovedRecord[] = [];
  for (const [id, old] of prevById.entries()) {
    if (!currentIds.has(id)) {
      removedRecords++;
      newlyRemoved.push({
        removed_at: now,
        removed_in_version: nextVersion,
        record: old,
      });
      items.push({
        id: old.id,
        sheet: old.source_sheet,
        row: old.source_row,
        model: old.model,
        type: "removed",
        old: old.mop,
      });
    }
  }

  // Mass removal safety check per sheet
  let blocking = false;
  const prevSheetCounts: Record<string, number> = {};
  for (const p of previous.products) {
    prevSheetCounts[p.source_sheet] = (prevSheetCounts[p.source_sheet] || 0) + 1;
  }
  const currSheetCounts: Record<string, number> = {};
  for (const p of current.products) {
    currSheetCounts[p.source_sheet] = (currSheetCounts[p.source_sheet] || 0) + 1;
  }

  for (const [sheet, prevCount] of Object.entries(prevSheetCounts)) {
    if (prevCount >= 5) {
      const currCount = currSheetCounts[sheet] || 0;
      const dropPct = ((prevCount - currCount) / prevCount) * 100;
      if (dropPct >= settings.mass_removal_block_pct) {
        blocking = true;
        issues.push({
          level: "error",
          code: "MASS_REMOVAL_DETECTED",
          sheet,
          blocking: true,
          message: `Sheet "${sheet}" lost ${prevCount - currCount}/${prevCount} (${Math.round(dropPct)}%) products. Publication blocked for safety.`,
        });
      }
    }
  }

  const existingRemoved = previous.removed || [];
  current.version = nextVersion;
  current.removed = [...existingRemoved, ...newlyRemoved];

  const changes: ChangeSummary = {
    records_checked: current.products.length,
    new_records: newRecords,
    updated_records: updatedRecords,
    removed_records: removedRecords,
    price_changes: priceChanges,
    offer_changes: offerChanges,
    items,
  };
  current.changes = changes;
  current.validation = [...current.validation, ...issues];

  return {
    dataset: current,
    changes,
    issues,
    blocking,
  };
}
