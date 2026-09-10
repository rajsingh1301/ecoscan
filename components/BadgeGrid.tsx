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
    <section className="flex flex-col gap-2.5">
      <div className="rule-label">
        <span className="eyebrow">
          Badges · {unlocked.size} of {BADGES.length}
        </span>
      </div>

      <div className="badge-grid">
        {BADGES.map((badge) => {
          const isUnlocked = unlocked.has(badge.id);
          return (
            <div
              key={badge.id}
              className={`badge${isUnlocked ? " is-unlocked" : ""}`}
              title={badge.description}
            >
              <span className="badge-mark">{badge.emoji}</span>
              <span className="badge-name">{badge.name}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
