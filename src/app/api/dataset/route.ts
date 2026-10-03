import { NextResponse } from "next/server";
import { getDataset } from "@/lib/sync/store";
import { runSync } from "@/lib/sync/service";

export async function GET() {
  let dataset = getDataset();
  if (!dataset) {
    const syncRes = await runSync({ trigger: "startup" });
    dataset = syncRes.dataset;
  }
  return NextResponse.json(dataset);
}
