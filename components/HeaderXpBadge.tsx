"use client";

import { useEffect, useState } from "react";
import { getHistory } from "@/lib/storage";
import { computeXp, getLevelProgress } from "@/lib/gamification";

export default function HeaderXpBadge() {
  const [xp, setXp] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setXp(computeXp(getHistory()));
  }, []);

  if (xp === null) return null;

  const progress = getLevelProgress(xp);

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-black/10 dark:border-white/20 px-2.5 py-1 text-xs font-medium">
      <span>{progress.level.emoji}</span>
      <span>Lv.{progress.level.level}</span>
    </div>
  );
}
