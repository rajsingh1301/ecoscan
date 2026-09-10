import { NextResponse } from "next/server";
import { scanScene } from "@/lib/ai";
import { getVerdict } from "@/lib/rulesEngine";
import { CLEANUP_XP_PER_ITEM } from "@/lib/gamification";
import type { SceneScanResult } from "@/lib/types";

interface SceneScanRequestBody {
  image?: string;
  regionKey?: string;
}

export async function POST(request: Request) {
  let body: SceneScanRequestBody;

  try {
    body = (await request.json()) as SceneScanRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { image, regionKey } = body;

  if (!image || typeof image !== "string") {
    return NextResponse.json({ error: "Missing required field: image" }, { status: 400 });
  }

  if (!regionKey || typeof regionKey !== "string") {
    return NextResponse.json({ error: "Missing required field: regionKey" }, { status: 400 });
  }

  const { items, note, error } = await scanScene(image);

  if (error) {
    return NextResponse.json({ error }, { status: 502 });
  }

  let totalItems = 0;
  let recyclableCount = 0;
  let landfillCount = 0;

  for (const item of items) {
    totalItems += item.count;
    const verdict = getVerdict(item.materialCategory, regionKey);
    if (verdict === "trash") {
      landfillCount += item.count;
    } else {
      recyclableCount += item.count;
    }
  }

  const result: SceneScanResult = {
    items,
    totalItems,
    recyclableCount,
    landfillCount,
    availableXp: totalItems * CLEANUP_XP_PER_ITEM,
    note,
  };

  return NextResponse.json(result);
}
