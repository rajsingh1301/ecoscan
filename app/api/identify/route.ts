import { NextResponse } from "next/server";
import { identifyImage, isMockMode } from "@/lib/claude";
import { getVerdict, getReasonForVerdict } from "@/lib/rulesEngine";
import type { MaterialCategory } from "@/lib/types";

interface IdentifyRequestBody {
  image?: string;
  regionKey?: string;
}

export async function POST(request: Request) {
  let body: IdentifyRequestBody;

  try {
    body = (await request.json()) as IdentifyRequestBody;
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

  const identification = await identifyImage(image);
  const category: MaterialCategory = identification.materialCategory;
  const verdict = getVerdict(category, regionKey);
  const reason = getReasonForVerdict(category, verdict);

  return NextResponse.json({
    itemName: identification.itemName,
    materialCategory: category,
    confidence: identification.confidence,
    verdict,
    reason,
    mock: isMockMode(),
  });
}
