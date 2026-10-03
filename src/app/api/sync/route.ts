import { NextResponse } from "next/server";
import { getSyncStatus, getSyncHistory } from "@/lib/sync/store";
import { runSync } from "@/lib/sync/service";

export async function GET() {
  const status = getSyncStatus();
  const history = getSyncHistory();
  return NextResponse.json({ status, history });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await runSync({
      trigger: body.trigger || "manual",
      force: body.force ?? true,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { status: "failed", message: err.message || "Sync execution failed" },
      { status: 500 }
    );
  }
}
