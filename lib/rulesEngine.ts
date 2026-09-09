import rulesData from "@/data/rules.json";
import type { MaterialCategory, RulesDataset, Verdict } from "@/lib/types";

const dataset = rulesData as RulesDataset;

export const DEMO_REGIONS: { key: string; label: string }[] = [
  { key: "default", label: "Other / Not sure (generic rules)" },
  { key: "us-sf", label: "San Francisco, USA" },
  { key: "us-nyc", label: "New York City, USA" },
  { key: "in-delhi", label: "Delhi, India" },
  { key: "in-bengaluru", label: "Bengaluru, India" },
];

/**
 * Rule 6 (ARCHITECTURE.md): the category -> verdict mapping lives only here,
 * never hardcoded in UI components.
 */
export function getVerdict(category: MaterialCategory, regionKey: string): Verdict {
  const region = dataset.regions[regionKey] ?? dataset.regions.default;
  const verdict = region[category] ?? dataset.regions.default[category];

  // Rule 5: hazardous / e-waste never routes to trash, even on a bad lookup.
  if ((category === "hazardous" || category === "e_waste") && verdict !== "special_dropoff") {
    return "special_dropoff";
  }

  return verdict;
}

export function getReasonForVerdict(category: MaterialCategory, verdict: Verdict): string {
  const reasons: Record<Verdict, Partial<Record<MaterialCategory, string>>> = {
    recycle: {
      plastic_1_2: "Plastics #1 (PET) and #2 (HDPE) are widely accepted by recycling facilities.",
      glass: "Glass is infinitely recyclable and accepted almost everywhere.",
      metal: "Metals retain value and are highly recyclable.",
      paper_clean: "Clean, dry paper and cardboard are recyclable.",
    },
    compost: {
      paper_greasy: "Grease contaminates paper recycling — compost it instead.",
      organic: "Food scraps and yard waste break down best in compost.",
    },
    trash: {
      plastic_3_7: "Plastics #3-7 are rarely accepted by local recycling programs.",
      mixed_other: "Mixed or non-recyclable materials belong in general waste.",
    },
    special_dropoff: {
      e_waste: "Electronics contain materials that need specialized recycling.",
      hazardous: "Hazardous materials require a dedicated collection point for safety.",
    },
  };

  return (
    reasons[verdict]?.[category] ??
    "Based on local disposal guidelines for this material type."
  );
}
