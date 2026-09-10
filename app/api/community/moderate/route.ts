import { NextResponse } from "next/server";
import { moderateImages } from "@/lib/ai";

const MAX_IMAGES = 2;

export async function POST(request: Request) {
  let body: { images?: unknown };

  try {
    body = (await request.json()) as { images?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const images = Array.isArray(body.images)
    ? body.images.filter((image): image is string => typeof image === "string")
    : [];

  if (images.length === 0) {
    return NextResponse.json({ error: "Missing required field: images" }, { status: 400 });
  }

  const result = await moderateImages(images.slice(0, MAX_IMAGES));
  return NextResponse.json(result);
}
