import { NextResponse } from "next/server";
import { verifyCleanup } from "@/lib/claude";
import { CLEANUP_FULL_BONUS, CLEANUP_XP_PER_ITEM } from "@/lib/gamification";
import { MATERIAL_CATEGORIES } from "@/lib/types";
import type { DetectedItem, MaterialCategory } from "@/lib/types";

interface VerifyRequestBody {
  beforeImage?: string;
  afterImage?: string;
  items?: unknown;
}

function parseItems(raw: unknown): DetectedItem[] {
  if (!Array.isArray(raw)) return [];

  const items: DetectedItem[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    const itemName = typeof record.itemName === "string" ? record.itemName : "Unidentified litter";
    const materialCategory =
      typeof record.materialCategory === "string" &&
      (MATERIAL_CATEGORIES as readonly string[]).includes(record.materialCategory)
        ? (record.materialCategory as MaterialCategory)
        : "mixed_other";
    const count = typeof record.count === "number" && record.count > 0 ? Math.floor(record.count) : 1;
    items.push({ itemName, materialCategory, count });
  }
  return items;
}

export async function POST(request: Request) {
  let body: VerifyRequestBody;

  try {
    body = (await request.json()) as VerifyRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { beforeImage, afterImage } = body;

  if (!beforeImage || typeof beforeImage !== "string") {
    return NextResponse.json({ error: "Missing required field: beforeImage" }, { status: 400 });
  }

  if (!afterImage || typeof afterImage !== "string") {
    return NextResponse.json({ error: "Missing required field: afterImage" }, { status: 400 });
  }

  const items = parseItems(body.items);
  const totalItems = items.reduce((sum, item) => sum + item.count, 0);

  if (totalItems === 0) {
    return NextResponse.json({ error: "No items were recorded for this quest." }, { status: 400 });
  }

  const { verification, error } = await verifyCleanup(beforeImage, afterImage, items);

  if (error || !verification) {
    return NextResponse.json({ error: error ?? "Verification failed." }, { status: 502 });
  }

  // No credit when the AI cannot confirm it is the same place — this is the
  // anti-gaming guard, so it must be enforced server-side, not in the UI.
  const xpEarned = verification.sameLocation
    ? verification.itemsRemoved * CLEANUP_XP_PER_ITEM +
      (verification.itemsRemoved === totalItems ? CLEANUP_FULL_BONUS : 0)
    : 0;

  return NextResponse.json({
    ...verification,
    totalItems,
    xpEarned,
    fullCleanup: verification.sameLocation && verification.itemsRemoved === totalItems,
  });
}
