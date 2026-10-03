import * as fs from "fs";
import * as path from "path";
import type { Dataset, SyncHistoryEntry, SyncStatus, AppSettings } from "../types";
import { DEFAULT_SETTINGS } from "../types";

const DATA_DIR = path.resolve(process.cwd(), "data");
const CURRENT_FILE = path.join(DATA_DIR, "current.json");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Writes data to a temporary file first, then renames it atomically.
 */
function atomicWriteJson(filePath: string, data: unknown): void {
  ensureDataDir();
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmpPath, filePath);
}

export function getDataset(): Dataset | null {
  try {
    if (fs.existsSync(CURRENT_FILE)) {
      const raw = fs.readFileSync(CURRENT_FILE, "utf8");
      return JSON.parse(raw) as Dataset;
    }
  } catch (err) {
    console.error("Failed to read current dataset:", err);
  }
  return null;
}

export function saveDataset(dataset: Dataset): void {
  atomicWriteJson(CURRENT_FILE, dataset);
}

export function getSyncHistory(): SyncHistoryEntry[] {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const raw = fs.readFileSync(HISTORY_FILE, "utf8");
      return JSON.parse(raw) as SyncHistoryEntry[];
    }
  } catch (err) {
    console.error("Failed to read sync history:", err);
  }
  return [];
}

export function appendSyncHistory(entry: SyncHistoryEntry): void {
  const history = getSyncHistory();
  history.unshift(entry);
  // Keep last 50 entries
  const trimmed = history.slice(0, 50);
  atomicWriteJson(HISTORY_FILE, trimmed);
}

export function getSettings(): AppSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, "utf8");
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error("Failed to read settings:", err);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  atomicWriteJson(SETTINGS_FILE, settings);
}

export function getSyncStatus(): SyncStatus {
  const dataset = getDataset();
  const history = getSyncHistory();
  const settings = getSettings();

  const lastEntry = history.length > 0 ? history[0] : null;
  const lastSuccess = history.find((h) => h.status === "success" || h.status === "no_change");

  let nextRun: string | null = null;
  if (settings.sync_interval_minutes > 0 && lastEntry) {
    const nextDate = new Date(new Date(lastEntry.finished_at).getTime() + settings.sync_interval_minutes * 60 * 1000);
    nextRun = nextDate.toISOString();
  }

  return {
    current_version: dataset?.version ?? null,
    last_attempt_at: lastEntry?.started_at ?? null,
    last_attempt_status: lastEntry?.status ?? null,
    last_success_at: lastSuccess?.finished_at ?? null,
    last_error: lastEntry?.status === "failed" || lastEntry?.status === "blocked" ? lastEntry.message : null,
    interval_minutes: settings.sync_interval_minutes,
    next_run_at: nextRun,
    running: false,
  };
}
