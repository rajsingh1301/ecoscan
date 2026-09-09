import { NextResponse } from "next/server";
import { DEMO_REGIONS } from "@/lib/rulesEngine";

export async function GET() {
  return NextResponse.json({ regions: DEMO_REGIONS });
}
