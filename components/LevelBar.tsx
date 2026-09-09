"use client";

import { useEffect, useState } from "react";
import { getHistory } from "@/lib/storage";
import { computeXp, getLevelProgress } from "@/lib/gamification";

export default function LevelBar() {
  const [xp, setXp] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setXp(computeXp(getHistory()));
  }, []);

  const progress = getLevelProgress(xp);

  return (
    <div className="w-full rounded-xl border border-black/10 dark:border-white/20 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="font-semibold flex items-center gap-2">
          <span className="text-xl">{progress.level.emoji}</span>
          Level {progress.level.level} · {progress.level.title}
        </p>
        <p className="text-xs text-black/50 dark:text-white/50">{xp} XP</p>
      </div>
      <div className="h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all"
          style={{ width: `${progress.progressPct}%` }}
        />
      </div>
      <p className="text-xs text-black/50 dark:text-white/50">
        {progress.next
          ? `${progress.xpForNextLevel - progress.xpIntoLevel} XP to ${progress.next.emoji} ${progress.next.title}`
          : "Max level reached — Eco Legend! 🌍"}
      </p>
    </div>
  );
}
