"use client";

import { useEffect, useState } from "react";
import { getHistory } from "@/lib/storage";
import { getTodayChallenge, getTodayHistory } from "@/lib/gamification";
import type { ScanRecord } from "@/lib/types";

export default function DailyChallengeCard() {
  const [todayHistory, setTodayHistory] = useState<ScanRecord[] | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTodayHistory(getTodayHistory(getHistory()));
  }, []);

  const challenge = getTodayChallenge();
  const done = todayHistory ? Math.min(challenge.progress(todayHistory), challenge.target) : 0;
  const complete = done >= challenge.target;

  return (
    <section className="flex flex-col gap-2.5">
      <div className="rule-label">
        <span className="eyebrow">Today</span>
      </div>

      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[0.95rem] font-medium">{challenge.description}</p>
        <p
          className="tabular text-[0.8rem] font-semibold"
          style={{ color: complete ? "var(--moss)" : "var(--ink-faint)" }}
        >
          {done}/{challenge.target}
        </p>
      </div>

      <div className={`meter${complete ? " is-done" : ""}`}>
        <i style={{ width: `${Math.round((done / challenge.target) * 100)}%` }} />
      </div>
    </section>
  );
}
