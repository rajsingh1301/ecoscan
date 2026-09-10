"use client";

import { getRank } from "@/lib/ranks";

/** A hexagon reads as a rank emblem without needing an icon set. */
function Emblem({ division, tier }: { division: number; tier: string }) {
  return (
    <span className="rank-emblem">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <polygon
          points="50,4 91,27 91,73 50,96 9,73 9,27"
          fill={`color-mix(in srgb, ${tier} 22%, transparent)`}
          stroke={tier}
          strokeWidth="5"
          strokeLinejoin="round"
        />
      </svg>
      <span>{"I".repeat(division)}</span>
    </span>
  );
}

interface RankCardProps {
  xp: number;
}

export default function RankCard({ xp }: RankCardProps) {
  const rank = getRank(xp);

  return (
    <div className="rank-card" style={{ ["--tier" as string]: rank.tier.color }}>
      <Emblem division={rank.division} tier={rank.tier.color} />

      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        <p className="rank-name">{rank.label}</p>

        <div className="meter">
          <i className="tier-fill" style={{ width: `${rank.progressPct}%` }} />
        </div>

        <p className="text-[0.78rem] tabular" style={{ color: "var(--ink-soft)" }}>
          {rank.xpToNextTier !== null && rank.nextTier
            ? `${rank.xpToNextTier} XP to ${rank.nextTier.name}`
            : "Top rank reached"}
          <span style={{ color: "var(--ink-faint)" }}> · {xp} XP total</span>
        </p>
      </div>
    </div>
  );
}
