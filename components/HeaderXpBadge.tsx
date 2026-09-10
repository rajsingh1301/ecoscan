"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCleanups, getHistory } from "@/lib/storage";
import { computeTotalXp } from "@/lib/gamification";
import { getRank } from "@/lib/ranks";

export default function HeaderXpBadge() {
  const [xp, setXp] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setXp(computeTotalXp(getHistory(), getCleanups()));
  }, []);

  if (xp === null) return null;

  const rank = getRank(xp);

  return (
    <Link
      href="/ranks"
      className="level-chip"
      style={{ ["--tier" as string]: rank.tier.color }}
      title={`${rank.label} · ${xp} XP — see leaderboards`}
    >
      <span className="level-chip-mark" aria-hidden="true" />
      {rank.tier.name}
    </Link>
  );
}
