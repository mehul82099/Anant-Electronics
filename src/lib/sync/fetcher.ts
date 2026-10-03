import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import type { SourceInfo } from "../types";

export const GOOGLE_SHEET_ID = "1sj8ptmZ_dSUVC9IvsMdPt_wkgAnMmYXCAO0qYUmFkTs";
export const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY || "AIzaSyBhiJ5voleJicesZ5luZ825iz8pcDRrLKQ";
export const LOCAL_FALLBACK_FILE = "C:/Users/Mehul/Downloads/MOP LIST NEW 28.10.25.xlsx";

export interface FetchResult {
  buffer: Buffer;
  source: SourceInfo;
}

/**
 * Downloads binary content following HTTP(S) redirects (like Google Sheets 307 redirect).
 */
export async function downloadWithRedirects(url: string, maxRedirects = 5): Promise<Buffer> {
  let currentUrl = url;
  for (let i = 0; i < maxRedirects; i++) {
    const res = await fetch(currentUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      redirect: "manual",
    });

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error(`HTTP ${res.status} redirect without location header`);
      currentUrl = loc;
      continue;
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  throw new Error(`Exceeded max redirects (${maxRedirects})`);
}

/**
 * Fetches the live workbook from Google Sheets, falling back to local file if offline.
 */
export async function fetchLiveWorkbook(sheetId = GOOGLE_SHEET_ID): Promise<FetchResult> {
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
  const now = new Date().toISOString();

  try {
    const buffer = await downloadWithRedirects(exportUrl);
    // Sanity check: must be a valid zip / xlsx header (PK..)
    if (buffer.length > 1000 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
      const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
      return {
        buffer,
        source: {
          kind: "google_sheets_live",
          label: "Google Sheets Live",
          workbook_name: `GoogleSheet_${sheetId.slice(0, 8)}`,
          fetched_at: now,
          bytes: buffer.byteLength,
          sha256,
        },
      };
    }
  } catch (err) {
    console.warn("Live Google Sheets fetch failed, checking local fallback:", err);
  }

  // Fallback to local file if available
  if (fs.existsSync(LOCAL_FALLBACK_FILE)) {
    const buffer = fs.readFileSync(LOCAL_FALLBACK_FILE);
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    return {
      buffer,
      source: {
        kind: "local_xlsx_fallback",
        label: "Local Workbook (MOP LIST NEW 28.10.25.xlsx)",
        workbook_name: "MOP LIST NEW 28.10.25.xlsx",
        fetched_at: now,
        bytes: buffer.byteLength,
        sha256,
      },
    };
  }

  throw new Error("Could not fetch Google Sheets live export and local fallback file is missing.");
}
