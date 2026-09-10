export interface Tier {
  name: string;
  minXp: number;
  /** Exclusive upper bound; null on the top tier. */
  maxXp: number | null;
  /** CSS custom property holding this tier's colour. */
  color: string;
  /** Top tier is undivided, the way a game's apex rank usually is. */
  divisions: number;
}

export const TIERS: Tier[] = [
  { name: "Bronze", minXp: 0, maxXp: 150, color: "var(--rank-bronze)", divisions: 3 },
  { name: "Silver", minXp: 150, maxXp: 400, color: "var(--rank-silver)", divisions: 3 },
  { name: "Gold", minXp: 400, maxXp: 800, color: "var(--rank-gold)", divisions: 3 },
  { name: "Platinum", minXp: 800, maxXp: 1500, color: "var(--rank-platinum)", divisions: 3 },
  { name: "Diamond", minXp: 1500, maxXp: 2500, color: "var(--rank-diamond)", divisions: 3 },
  { name: "Master", minXp: 2500, maxXp: 4000, color: "var(--rank-master)", divisions: 3 },
  { name: "Legend", minXp: 4000, maxXp: null, color: "var(--rank-legend)", divisions: 1 },
];

const ROMAN = ["I", "II", "III", "IV", "V"];

export interface Rank {
  tier: Tier;
  /** 1 is the highest division inside a tier, matching how ranked ladders read. */
  division: number;
  /** "Gold II", or just "Legend" on the undivided top tier. */
  label: string;
  xp: number;
  /** Progress through the whole tier, 0-100. */
  progressPct: number;
  /** XP still needed for the next tier, or null at the top. */
  xpToNextTier: number | null;
  nextTier: Tier | null;
}

export function getRank(xp: number): Rank {
  const index = TIERS.findIndex(
    (tier) => xp >= tier.minXp && (tier.maxXp === null || xp < tier.maxXp)
  );
  const tier = TIERS[index === -1 ? TIERS.length - 1 : index];
  const nextTier = TIERS[TIERS.indexOf(tier) + 1] ?? null;

  if (tier.maxXp === null) {
    return {
      tier,
      division: 1,
      label: tier.name,
      xp,
      progressPct: 100,
      xpToNextTier: null,
      nextTier: null,
    };
  }

  const span = tier.maxXp - tier.minXp;
  const into = xp - tier.minXp;
  const step = span / tier.divisions;

  // Divisions count down as you climb, so III is the entry rung and I the top.
  const climbed = Math.min(tier.divisions - 1, Math.floor(into / step));
  const division = tier.divisions - climbed;

  return {
    tier,
    division,
    label: `${tier.name} ${ROMAN[division - 1]}`,
    xp,
    progressPct: Math.min(100, Math.round((into / span) * 100)),
    xpToNextTier: tier.maxXp - xp,
    nextTier,
  };
}

const COUNTRIES: Record<string, string> = {
  in: "India",
  us: "United States",
};

export function countryOf(regionKey: string): { code: string; name: string } | null {
  const code = regionKey.split("-")[0];
  const name = COUNTRIES[code];
  return name ? { code, name } : null;
}
