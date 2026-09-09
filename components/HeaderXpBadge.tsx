"use client";

import { useEffect, useState } from "react";
import { getCleanups, getHistory } from "@/lib/storage";
import { computeTotalXp, getLevelProgress } from "@/lib/gamification";

export default function HeaderXpBadge() {
  const [xp, setXp] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setXp(computeTotalXp(getHistory(), getCleanups()));
  }, []);

  if (xp === null) return null;

  const { level } = getLevelProgress(xp);

  return (
    <span className="level-chip" title={`${level.title} · ${xp} XP`}>
      <span className="level-chip-mark" aria-hidden="true" />
      L{level.level}
    </span>
  );
}
