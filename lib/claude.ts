import type {
  IdentifyResult,
  MaterialCategory,
  ConfidenceLevel,
  DetectedItem,
  CleanupVerification,
} from "@/lib/types";
import { MATERIAL_CATEGORIES, CONFIDENCE_LEVELS } from "@/lib/types";

/**
 * AI identification client.
 *
 * STATUS: LIVE, backed by Google Gemini (gemini-2.5-flash) — chosen because it
 * has a genuinely free tier with vision support, so the hackathon build isn't
 * blocked on billing setup.
 *
 * Claude Sonnet via AWS Bedrock was the original plan (see ARCHITECTURE.md
 * section 11) but is on hold: the AWS account needs a valid payment
 * instrument attached before Bedrock model access activates (AWS Marketplace
 * requirement), even with free credits. Once that's sorted, swap this file's
 * implementation for a Bedrock call — the rest of the app (rulesEngine, API
 * route, UI) is written against the `IdentifyResult` contract below and does
 * not need to change.
 */

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const IDENTIFY_PROMPT = `You are a waste-sorting assistant. Look at the photo and identify the single most prominent item.

Respond with JSON only, matching exactly this shape:
{
  "itemName": string (short, e.g. "Plastic water bottle"),
  "materialCategory": one of ${MATERIAL_CATEGORIES.join(" | ")},
  "confidence": one of ${CONFIDENCE_LEVELS.join(" | ")},
  "reasoning": string (one short sentence explaining the material category choice)
}

Category guide:
- plastic_1_2: PET/HDPE plastics (bottles, jugs) — usually marked #1 or #2
- plastic_3_7: other plastics (styrofoam, film, mixed plastics) — usually marked #3-7
- glass: glass bottles, jars
- metal: aluminum cans, tin, steel
- paper_clean: dry, clean paper/cardboard
- paper_greasy: food-soiled paper (e.g. pizza boxes)
- organic: food scraps, yard waste
- e_waste: electronics, batteries, cables, chargers
- hazardous: chemicals, paint, sharps, anything dangerous
- mixed_other: anything that doesn't clearly fit above, or the image is unclear

If you are not confident, set confidence to "low" rather than guessing high. Never mark e_waste or hazardous items as anything other than what they clearly are.`;

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
  }[];
}

type GeminiOutcome =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string };

async function callGeminiJson(parts: GeminiPart[]): Promise<GeminiOutcome> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "AI provider not configured (missing GEMINI_API_KEY)." };
  }

  let response: Response;
  try {
    response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });
  } catch {
    return { ok: false, error: "Could not reach the AI provider — check your connection." };
  }

  if (!response.ok) {
    return { ok: false, error: `AI provider error (status ${response.status}).` };
  }

  let data: GeminiResponse;
  try {
    data = (await response.json()) as GeminiResponse;
  } catch {
    return { ok: false, error: "AI provider returned an unreadable response." };
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return { ok: false, error: "AI provider returned no result." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "Could not parse AI response as JSON." };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, error: "AI response was not a valid object." };
  }

  return { ok: true, value: parsed as Record<string, unknown> };
}

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    // Assume it's already raw base64 JPEG data.
    return { mimeType: "image/jpeg", base64: dataUrl };
  }
  return { mimeType: match[1], base64: match[2] };
}

function isMaterialCategory(value: unknown): value is MaterialCategory {
  return typeof value === "string" && (MATERIAL_CATEGORIES as readonly string[]).includes(value);
}

function isConfidenceLevel(value: unknown): value is ConfidenceLevel {
  return typeof value === "string" && (CONFIDENCE_LEVELS as readonly string[]).includes(value);
}

function fallbackResult(reasoning: string): IdentifyResult {
  return {
    itemName: "Unidentified item",
    materialCategory: "mixed_other",
    confidence: "low",
    reasoning,
  };
}

export async function identifyImage(base64Image: string): Promise<IdentifyResult> {
  const { mimeType, base64 } = parseDataUrl(base64Image);

  const outcome = await callGeminiJson([
    { text: IDENTIFY_PROMPT },
    { inline_data: { mime_type: mimeType, data: base64 } },
  ]);

  if (!outcome.ok) {
    return fallbackResult(outcome.error);
  }

  const record = outcome.value;
  const materialCategory = isMaterialCategory(record.materialCategory)
    ? record.materialCategory
    : "mixed_other";
  const confidence = isConfidenceLevel(record.confidence) ? record.confidence : "low";
  const itemName = typeof record.itemName === "string" && record.itemName.trim() ? record.itemName : "Unidentified item";
  const reasoning =
    typeof record.reasoning === "string" && record.reasoning.trim()
      ? record.reasoning
      : "No detailed reasoning provided.";

  return { itemName, materialCategory, confidence, reasoning };
}

export function isMockMode(): boolean {
  return false;
}

export const SUPPORTED_CATEGORIES = MATERIAL_CATEGORIES;

const MAX_SCENE_ITEMS = 40;

const SCENE_SCAN_PROMPT = `You are analyzing a photo of a littered area for a community cleanup app.

Identify every piece of litter or loose waste visible in the scene. Group identical items together and give a count.

Respond with JSON only:
{
  "items": [{ "itemName": string, "materialCategory": ${MATERIAL_CATEGORIES.join(" | ")}, "count": number }],
  "note": string (one short sentence describing the scene)
}

Rules:
- Count only actual litter/waste. Do NOT count permanent fixtures: bins, benches, signs, buildings, parked vehicles, plants, or people.
- Items still inside a proper bin are not litter — do not count them.
- If you cannot tell an item's material, use "mixed_other".
- Cap the total count at ${MAX_SCENE_ITEMS}. If there is clearly more, count up to the cap and say so in the note.
- If there is no visible litter, return an empty items array and explain that in the note.`;

export async function scanScene(
  base64Image: string
): Promise<{ items: DetectedItem[]; note: string; error?: string }> {
  const { mimeType, base64 } = parseDataUrl(base64Image);

  const outcome = await callGeminiJson([
    { text: SCENE_SCAN_PROMPT },
    { inline_data: { mime_type: mimeType, data: base64 } },
  ]);

  if (!outcome.ok) {
    return { items: [], note: "", error: outcome.error };
  }

  const rawItems = Array.isArray(outcome.value.items) ? outcome.value.items : [];

  // The model often returns the same thing as several rows ("Bottle x2", "Bottle x1")
  // instead of grouping it, so fold matching rows together before display.
  const grouped = new Map<string, DetectedItem>();
  let running = 0;

  for (const raw of rawItems) {
    if (typeof raw !== "object" || raw === null) continue;
    const entry = raw as Record<string, unknown>;

    const itemName =
      typeof entry.itemName === "string" && entry.itemName.trim() ? entry.itemName.trim() : "Unidentified litter";
    const materialCategory = isMaterialCategory(entry.materialCategory) ? entry.materialCategory : "mixed_other";
    const parsedCount = typeof entry.count === "number" ? Math.floor(entry.count) : 1;
    const count = Math.max(1, Math.min(parsedCount, MAX_SCENE_ITEMS - running));

    if (count <= 0) break;

    const key = `${itemName.toLowerCase()}|${materialCategory}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.count += count;
    } else {
      grouped.set(key, { itemName, materialCategory, count });
    }

    running += count;
    if (running >= MAX_SCENE_ITEMS) break;
  }

  const items = [...grouped.values()];

  const note =
    typeof outcome.value.note === "string" && outcome.value.note.trim()
      ? outcome.value.note.trim()
      : items.length > 0
        ? "Litter detected in this area."
        : "No litter detected in this scene.";

  return { items, note };
}

const MODERATION_PROMPT = `You are screening photos that a user wants to publish to a public community feed in a litter-cleanup app. The photos are supposed to show a place before and after being cleaned.

Respond with JSON only:
{
  "allowed": boolean,
  "reason": string (one short sentence; if allowed, a brief confirmation)
}

Set allowed to false if any photo contains:
- A recognisable human face, or a person as the clear subject of the photo
- A readable vehicle licence plate, house number, or other identifying personal detail
- Nudity, violence, gore, or other content unsuitable for a general audience
- Content that is clearly not an outdoor/indoor place or waste (for example a screenshot, a document, or a selfie)

Set allowed to true for ordinary photos of streets, parks, beaches, rooms, or waste.
Distant, small, or incidental people who are not identifiable are acceptable.
When genuinely uncertain, allow the photo rather than blocking it, but say why in the reason.`;

export async function moderateImages(
  images: string[]
): Promise<{ allowed: boolean; reason: string }> {
  const parts: GeminiPart[] = [{ text: MODERATION_PROMPT }];

  for (const image of images) {
    const { mimeType, base64 } = parseDataUrl(image);
    parts.push({ inline_data: { mime_type: mimeType, data: base64 } });
  }

  const outcome = await callGeminiJson(parts);

  if (!outcome.ok) {
    return { allowed: false, reason: "Could not check the photos right now. Please try again." };
  }

  const allowed = outcome.value.allowed === true;
  const reason =
    typeof outcome.value.reason === "string" && outcome.value.reason.trim()
      ? outcome.value.reason.trim()
      : allowed
        ? "Photos look fine."
        : "These photos can't be shared publicly.";

  return { allowed, reason };
}

const VERIFY_PROMPT_HEADER = `You are verifying a community cleanup for an app that awards points. Be strict and honest — people earn real rewards based on your answer, so never give credit that was not earned.

You are given two photos of the same place: the FIRST image is BEFORE the cleanup, the SECOND image is AFTER.

Respond with JSON only:
{
  "sameLocation": boolean,
  "itemsRemoved": number,
  "itemsRemaining": number,
  "confidence": "high" | "medium" | "low",
  "notes": string (one or two short sentences explaining your assessment)
}

Rules:
- sameLocation: true only if the AFTER photo plausibly shows the same place as the BEFORE photo (same ground surface, background, or landmarks). A different angle, distance, or lighting is fine. A clearly different place is false.
- itemsRemoved: how many of the items listed below are genuinely gone in the AFTER photo. It must never exceed the total listed.
- If the AFTER photo is framed so differently that items may simply be out of frame rather than removed, do not assume they were removed: lower itemsRemoved, set confidence to "low", and say so in notes.
- Be conservative. When unsure, credit fewer items rather than more.`;

export async function verifyCleanup(
  beforeImage: string,
  afterImage: string,
  detectedItems: DetectedItem[]
): Promise<{ verification: CleanupVerification | null; error?: string }> {
  const before = parseDataUrl(beforeImage);
  const after = parseDataUrl(afterImage);

  const totalItems = detectedItems.reduce((sum, item) => sum + item.count, 0);
  const itemList = detectedItems.map((item) => `- ${item.itemName} x${item.count}`).join("\n");

  const prompt = `${VERIFY_PROMPT_HEADER}

The BEFORE photo was assessed to contain these ${totalItems} item(s):
${itemList || "- (none recorded)"}`;

  const outcome = await callGeminiJson([
    { text: prompt },
    { text: "BEFORE photo:" },
    { inline_data: { mime_type: before.mimeType, data: before.base64 } },
    { text: "AFTER photo:" },
    { inline_data: { mime_type: after.mimeType, data: after.base64 } },
  ]);

  if (!outcome.ok) {
    return { verification: null, error: outcome.error };
  }

  const record = outcome.value;
  const rawRemoved = typeof record.itemsRemoved === "number" ? Math.floor(record.itemsRemoved) : 0;
  const itemsRemoved = Math.max(0, Math.min(rawRemoved, totalItems));

  return {
    verification: {
      sameLocation: record.sameLocation !== false,
      itemsRemoved,
      itemsRemaining: totalItems - itemsRemoved,
      confidence: isConfidenceLevel(record.confidence) ? record.confidence : "low",
      notes:
        typeof record.notes === "string" && record.notes.trim()
          ? record.notes.trim()
          : "No additional notes provided.",
    },
  };
}
