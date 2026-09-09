import type { IdentifyResult, MaterialCategory, ConfidenceLevel } from "@/lib/types";
import { MATERIAL_CATEGORIES } from "@/lib/types";

/**
 * AI identification client.
 *
 * STATUS: MOCKED. Real integration (Claude Sonnet via AWS Bedrock) is on hold
 * until an AWS Bedrock key/role is available — see ARCHITECTURE.md section 11.
 *
 * When ready, replace the body of `identifyImage` below with a call to the
 * Bedrock Mantle client, e.g.:
 *
 *   import { AnthropicBedrockMantle } from "@anthropic-ai/bedrock-sdk";
 *   const client = new AnthropicBedrockMantle({ awsRegion: "us-east-1" });
 *   const response = await client.messages.create({
 *     model: "anthropic.claude-sonnet-5",
 *     max_tokens: 512,
 *     messages: [{
 *       role: "user",
 *       content: [
 *         { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64Image } },
 *         { type: "text", text: IDENTIFY_PROMPT },
 *       ],
 *     }],
 *   });
 *   // then parse response.content[0].text as JSON matching IdentifyResult
 *
 * The rest of the app (rulesEngine, API route, UI) is written against the
 * `IdentifyResult` contract and does not need to change when this is swapped in.
 */

const MOCK_ITEMS: { itemName: string; materialCategory: MaterialCategory; confidence: ConfidenceLevel }[] = [
  { itemName: "Plastic water bottle", materialCategory: "plastic_1_2", confidence: "high" },
  { itemName: "Glass jar", materialCategory: "glass", confidence: "high" },
  { itemName: "Aluminum can", materialCategory: "metal", confidence: "high" },
  { itemName: "Greasy pizza box", materialCategory: "paper_greasy", confidence: "medium" },
  { itemName: "Banana peel", materialCategory: "organic", confidence: "high" },
  { itemName: "Styrofoam takeout container", materialCategory: "plastic_3_7", confidence: "medium" },
  { itemName: "Old phone charger", materialCategory: "e_waste", confidence: "high" },
  { itemName: "Unidentified item", materialCategory: "mixed_other", confidence: "low" },
];

function pseudoRandomIndex(seed: string, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1_000_003;
  }
  return hash % max;
}

export async function identifyImage(base64Image: string): Promise<IdentifyResult> {
  // Simulate network latency so the UI loading state is realistic to demo.
  await new Promise((resolve) => setTimeout(resolve, 600));

  const index = pseudoRandomIndex(base64Image.slice(-64), MOCK_ITEMS.length);
  const pick = MOCK_ITEMS[index];

  return {
    itemName: pick.itemName,
    materialCategory: pick.materialCategory,
    confidence: pick.confidence,
    reasoning: "Mock identification — swap in Claude (Bedrock) in lib/claude.ts when the AWS key is ready.",
  };
}

export function isMockMode(): boolean {
  return true;
}

export const SUPPORTED_CATEGORIES = MATERIAL_CATEGORIES;
