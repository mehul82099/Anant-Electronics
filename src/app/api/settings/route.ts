import { NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/sync/store";

export async function GET() {
  return NextResponse.json(getSettings());
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    saveSettings(body);
    return NextResponse.json({ success: true, settings: getSettings() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
