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

  if (todayHistory === null) return null;

  const challenge = getTodayChallenge();
  const progress = Math.min(challenge.progress(todayHistory), challenge.target);
  const complete = progress >= challenge.target;
  const pct = Math.round((progress / challenge.target) * 100);

  return (
    <div
      className={`w-full rounded-xl border p-4 flex flex-col gap-2 ${
        complete
          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
          : "border-black/10 dark:border-white/20"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          {complete ? "✅" : "🎯"} Today&apos;s Challenge
        </p>
        <p className="text-xs text-black/50 dark:text-white/50">
          {progress}/{challenge.target}
        </p>
      </div>
      <p className="text-sm">{challenge.description}</p>
      <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
        <div
          className={`h-full transition-all ${complete ? "bg-emerald-500" : "bg-emerald-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
