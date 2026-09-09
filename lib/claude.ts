import type { IdentifyResult, MaterialCategory, ConfidenceLevel } from "@/lib/types";
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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fallbackResult("AI provider not configured (missing GEMINI_API_KEY).");
  }

  const { mimeType, base64 } = parseDataUrl(base64Image);

  const parts: GeminiPart[] = [
    { text: IDENTIFY_PROMPT },
    { inline_data: { mime_type: mimeType, data: base64 } },
  ];

  let response: Response;
  try {
    response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });
  } catch {
    return fallbackResult("Could not reach the AI provider — check your connection.");
  }

  if (!response.ok) {
    return fallbackResult(`AI provider error (status ${response.status}).`);
  }

  let data: GeminiResponse;
  try {
    data = (await response.json()) as GeminiResponse;
  } catch {
    return fallbackResult("AI provider returned an unreadable response.");
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return fallbackResult("AI provider returned no result.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return fallbackResult("Could not parse AI response as JSON.");
  }

  if (typeof parsed !== "object" || parsed === null) {
    return fallbackResult("AI response was not a valid object.");
  }

  const record = parsed as Record<string, unknown>;
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
