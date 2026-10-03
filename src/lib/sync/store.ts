import * as fs from "fs";
import * as path from "path";
import type { Dataset, SyncHistoryEntry, SyncStatus, AppSettings } from "../types";
import { DEFAULT_SETTINGS } from "../types";

// In serverless environments (e.g. Vercel), process.cwd() is read-only.
// We write dynamic state to /tmp/anant-data and read initial state from public/data/default_dataset.json or data/
const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = IS_SERVERLESS
  ? path.resolve("/tmp", "anant-data")
  : path.resolve(process.cwd(), "data");

const CURRENT_FILE = path.join(DATA_DIR, "current.json");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

// Fallback pre-bundled dataset packaged with the repository
const BUNDLED_DATASET_FILE = path.resolve(process.cwd(), "public", "data", "default_dataset.json");
const REPO_DATASET_FILE = path.resolve(process.cwd(), "data", "current.json");

// In-memory cache for ultra-fast response
let memoryDataset: Dataset | null = null;
let memoryHistory: SyncHistoryEntry[] = [];
let memorySettings: AppSettings = DEFAULT_SETTINGS;

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("Could not create DATA_DIR, using in-memory store:", err);
  }
}

/**
 * Writes data to a temporary file first, then renames it atomically.
 */
function atomicWriteJson(filePath: string, data: unknown): void {
  try {
    ensureDataDir();
    const tmpPath = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    console.warn(`Atomic write failed for ${filePath}, retained in memory:`, err);
  }
}

export function getDataset(): Dataset | null {
  if (memoryDataset) return memoryDataset;

  // Try dynamic storage first
  try {
    if (fs.existsSync(CURRENT_FILE)) {
      const raw = fs.readFileSync(CURRENT_FILE, "utf8");
      memoryDataset = JSON.parse(raw) as Dataset;
      return memoryDataset;
    }
  } catch (err) {
    console.warn("Failed reading dynamic CURRENT_FILE:", err);
  }

  // Fallback to bundled dataset packaged in repository
  const bundledPath = fs.existsSync(BUNDLED_DATASET_FILE)
    ? BUNDLED_DATASET_FILE
    : fs.existsSync(REPO_DATASET_FILE)
    ? REPO_DATASET_FILE
    : null;

  if (bundledPath) {
    try {
      const raw = fs.readFileSync(bundledPath, "utf8");
      memoryDataset = JSON.parse(raw) as Dataset;
      return memoryDataset;
    } catch (err) {
      console.error("Failed reading bundled dataset:", err);
    }
  }

  return null;
}

export function saveDataset(dataset: Dataset): void {
  memoryDataset = dataset;
  atomicWriteJson(CURRENT_FILE, dataset);
}

export function getSyncHistory(): SyncHistoryEntry[] {
  if (memoryHistory.length > 0) return memoryHistory;
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const raw = fs.readFileSync(HISTORY_FILE, "utf8");
      memoryHistory = JSON.parse(raw) as SyncHistoryEntry[];
      return memoryHistory;
    }
  } catch (err) {
    console.error("Failed to read sync history:", err);
  }
  return [];
}

export function appendSyncHistory(entry: SyncHistoryEntry): void {
  memoryHistory.unshift(entry);
  memoryHistory = memoryHistory.slice(0, 50);
  atomicWriteJson(HISTORY_FILE, memoryHistory);
}

export function getSettings(): AppSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, "utf8");
      memorySettings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      return memorySettings;
    }
  } catch (err) {
    console.error("Failed to read settings:", err);
  }
  return memorySettings;
}

export function saveSettings(settings: AppSettings): void {
  memorySettings = settings;
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
