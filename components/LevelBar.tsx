"use client";

import { useEffect, useState } from "react";
import { getCleanups, getHistory } from "@/lib/storage";
import { computeTotalXp, getLevelProgress } from "@/lib/gamification";

export default function LevelBar() {
  const [xp, setXp] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setXp(computeTotalXp(getHistory(), getCleanups()));
  }, []);

  const progress = getLevelProgress(xp);

  return (
    <section className="flex flex-col gap-2.5">
      <div className="rule-label">
        <span className="eyebrow">
          Level {progress.level.level} · {progress.level.title}
        </span>
      </div>

      <div className="meter">
        <i style={{ width: `${progress.progressPct}%` }} />
      </div>

      <p className="text-[0.8rem]" style={{ color: "var(--ink-faint)" }}>
        {progress.next
          ? `${progress.xpForNextLevel - progress.xpIntoLevel} XP to ${progress.next.title}`
          : "Top level reached."}
      </p>
    </section>
  );
}
