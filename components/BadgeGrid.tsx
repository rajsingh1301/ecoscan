"use client";

import { useEffect, useState } from "react";
import { getCleanups, getHistory, getStreakDays } from "@/lib/storage";
import { BADGES, getUnlockedBadgeIds } from "@/lib/gamification";

export default function BadgeGrid() {
  const [unlocked, setUnlocked] = useState<Set<string> | null>(null);

  useEffect(() => {
    const history = getHistory();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUnlocked(
      getUnlockedBadgeIds({
        history,
        streak: getStreakDays(history),
        cleanups: getCleanups(),
      })
    );
  }, []);

  if (unlocked === null) return null;

  return (
    <div className="w-full">
      <p className="text-sm font-medium mb-2">
        Badges ({unlocked.size}/{BADGES.length})
      </p>
      <div className="grid grid-cols-3 gap-2">
        {BADGES.map((badge) => {
          const isUnlocked = unlocked.has(badge.id);
          return (
            <div
              key={badge.id}
              title={badge.description}
              className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center ${
                isUnlocked
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
                  : "border-black/10 dark:border-white/10 opacity-40 grayscale"
              }`}
            >
              <span className="text-2xl">{badge.emoji}</span>
              <span className="text-[11px] font-medium leading-tight">{badge.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
