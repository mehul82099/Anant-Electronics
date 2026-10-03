import type { Dataset, SyncHistoryEntry } from "../types";
import { fetchLiveWorkbook } from "./fetcher";
import { parseWorkbook } from "../parse/workbook";
import { computeDiffAndIntegrate } from "./diff";
import { getDataset, saveDataset, appendSyncHistory, getSettings } from "./store";

export interface SyncOptions {
  trigger?: "schedule" | "manual" | "cron" | "startup" | "cli";
  force?: boolean;
}

export interface SyncExecutionResult {
  status: "success" | "no_change" | "failed" | "blocked";
  message: string;
  dataset: Dataset | null;
  historyEntry: SyncHistoryEntry;
}

export async function runSync(options: SyncOptions = {}): Promise<SyncExecutionResult> {
  const trigger = options.trigger || "manual";
  const startedAt = new Date().toISOString();
  const syncId = `SYNC_${Date.now()}`;
  const previous = getDataset();
  const settings = getSettings();

  try {
    // 1. Fetch workbook
    const { buffer, source } = await fetchLiveWorkbook();

    // Check if identical buffer by sha256 (unless force)
    if (!options.force && previous && previous.source && previous.source.sha256 === source.sha256) {
      const finishedAt = new Date().toISOString();
      const entry: SyncHistoryEntry = {
        id: syncId,
        started_at: startedAt,
        finished_at: finishedAt,
        trigger,
        status: "no_change",
        version: previous.version,
        message: `No changes detected in source (SHA256: ${source.sha256.slice(0, 10)}...).`,
        stats: {
          records_checked: previous.products.length,
          new_records: 0,
          updated_records: 0,
          removed_records: 0,
          price_changes: 0,
          offer_changes: 0,
          warnings: previous.validation.filter((v) => v.level === "warning").length,
          errors: 0,
        },
      };
      appendSyncHistory(entry);
      return {
        status: "no_change",
        message: entry.message,
        dataset: previous,
        historyEntry: entry,
      };
    }

    // 2. Parse workbook
    const nextVersion = previous ? previous.version + 1 : 1;
    const parsed = parseWorkbook({
      buffer,
      sourceInfo: source,
      syncVersion: nextVersion,
    });

    // 3. Check for blocking parse issues (e.g. STRUCTURE_CHANGED)
    const blockingIssues = parsed.validation.filter((v) => v.blocking);
    if (blockingIssues.length > 0) {
      const finishedAt = new Date().toISOString();
      const msg = `Publication blocked due to ${blockingIssues.length} structure change error(s): ${blockingIssues.map((b) => b.message).join("; ")}`;
      const entry: SyncHistoryEntry = {
        id: syncId,
        started_at: startedAt,
        finished_at: finishedAt,
        trigger,
        status: "blocked",
        version: previous?.version ?? null,
        message: msg,
        stats: null,
        issues: blockingIssues,
      };
      appendSyncHistory(entry);
      return {
        status: "blocked",
        message: msg,
        dataset: previous,
        historyEntry: entry,
      };
    }

    // 4. Compute diff and mass-removal safety
    const diffResult = computeDiffAndIntegrate(parsed, previous, settings);
    if (diffResult.blocking) {
      const finishedAt = new Date().toISOString();
      const msg = `Publication blocked by safety guardrail: ${diffResult.issues.map((i) => i.message).join("; ")}`;
      const entry: SyncHistoryEntry = {
        id: syncId,
        started_at: startedAt,
        finished_at: finishedAt,
        trigger,
        status: "blocked",
        version: previous?.version ?? null,
        message: msg,
        stats: null,
        issues: diffResult.issues,
      };
      appendSyncHistory(entry);
      return {
        status: "blocked",
        message: msg,
        dataset: previous,
        historyEntry: entry,
      };
    }

    // 5. Persist published dataset
    saveDataset(diffResult.dataset);

    const finishedAt = new Date().toISOString();
    const entry: SyncHistoryEntry = {
      id: syncId,
      started_at: startedAt,
      finished_at: finishedAt,
      trigger,
      status: "success",
      version: diffResult.dataset.version,
      message: `Synchronized ${diffResult.dataset.products.length} products (v${diffResult.dataset.version}) from ${source.label}.`,
      stats: {
        records_checked: diffResult.changes.records_checked,
        new_records: diffResult.changes.new_records,
        updated_records: diffResult.changes.updated_records,
        removed_records: diffResult.changes.removed_records,
        price_changes: diffResult.changes.price_changes,
        offer_changes: diffResult.changes.offer_changes,
        warnings: diffResult.dataset.validation.filter((v) => v.level === "warning").length,
        errors: 0,
      },
      changes: diffResult.changes.items,
    };
    appendSyncHistory(entry);

    return {
      status: "success",
      message: entry.message,
      dataset: diffResult.dataset,
      historyEntry: entry,
    };
  } catch (err: any) {
    const finishedAt = new Date().toISOString();
    const msg = `Sync failed: ${err.message || String(err)}`;
    const entry: SyncHistoryEntry = {
      id: syncId,
      started_at: startedAt,
      finished_at: finishedAt,
      trigger,
      status: "failed",
      version: previous?.version ?? null,
      message: msg,
      stats: null,
    };
    appendSyncHistory(entry);
    return {
      status: "failed",
      message: msg,
      dataset: previous,
      historyEntry: entry,
    };
  }
}
