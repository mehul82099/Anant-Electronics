import { NextResponse } from "next/server";
import { getDataset, getSyncHistory } from "@/lib/sync/store";
import { runSync } from "@/lib/sync/service";

// Ensure route is never statically cached
export const dynamic = "force-dynamic";
export const revalidate = 0;

let lastSyncTime = 0;
let isSyncing = false;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const forceCheck = url.searchParams.get("live") === "1" || url.searchParams.get("force") === "1";
  const now = Date.now();

  let dataset = getDataset();

  // If no dataset exists or forced or 5 seconds elapsed since last check, sync in background or immediately
  if (!dataset) {
    try {
      const syncRes = await runSync({ trigger: "startup" });
      dataset = syncRes.dataset || getDataset();
      lastSyncTime = Date.now();
    } catch (err) {
      console.error("Startup sync error, falling back to stored dataset:", err);
      dataset = getDataset();
    }
  } else if ((forceCheck || now - lastSyncTime > 5000) && !isSyncing) {
    // Fast debounce: check if Google Sheets has updated without blocking the response
    isSyncing = true;
    runSync({ trigger: "schedule", force: false })
      .then((res) => {
        lastSyncTime = Date.now();
      })
      .catch((err) => {
        console.warn("Background sheet sync check error:", err);
      })
      .finally(() => {
        isSyncing = false;
      });
  }

  // Safety fallback: if somehow still null, try getDataset one more time
  if (!dataset) {
    dataset = getDataset();
  }

  return NextResponse.json(dataset, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

