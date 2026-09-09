"use client";

import { useEffect, useState } from "react";
import { clearHistory, getHistory, getStreakDays } from "@/lib/storage";
import { VERDICT_STYLES } from "@/lib/verdictStyles";
import type { ScanRecord, Verdict } from "@/lib/types";
import { VERDICTS } from "@/lib/types";

export default function ImpactDashboard() {
  const [history, setHistory] = useState<ScanRecord[]>([]);

  useEffect(() => {
    // localStorage is client-only; read post-mount to avoid SSR mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(getHistory());
  }, []);

  const counts: Record<Verdict, number> = {
    recycle: 0,
    compost: 0,
    trash: 0,
    special_dropoff: 0,
  };
  history.forEach((record) => {
    counts[record.verdict] += 1;
  });

  const diverted = counts.recycle + counts.compost + counts.special_dropoff;
  const streak = getStreakDays(history);

  function handleClear() {
    clearHistory();
    setHistory([]);
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl border border-black/10 dark:border-white/20 p-3">
          <p className="text-2xl font-bold">{history.length}</p>
          <p className="text-xs text-black/50 dark:text-white/50">Items scanned</p>
        </div>
        <div className="rounded-xl border border-black/10 dark:border-white/20 p-3">
          <p className="text-2xl font-bold">{diverted}</p>
          <p className="text-xs text-black/50 dark:text-white/50">Diverted from trash</p>
        </div>
        <div className="rounded-xl border border-black/10 dark:border-white/20 p-3">
          <p className="text-2xl font-bold">{streak}🔥</p>
          <p className="text-xs text-black/50 dark:text-white/50">Day streak</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {VERDICTS.map((verdict) => {
          const style = VERDICT_STYLES[verdict];
          const count = counts[verdict];
          const pct = history.length ? Math.round((count / history.length) * 100) : 0;
          return (
            <div key={verdict} className="flex items-center gap-3">
              <span className="w-32 text-sm shrink-0">
                {style.emoji} {style.label}
              </span>
              <div className="flex-1 h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full ${style.bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-black/50 dark:text-white/50 w-8 text-right">
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50 text-center">
          No scans yet — go scan your first item!
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Recent scans</p>
          <ul className="flex flex-col gap-1 max-h-64 overflow-y-auto">
            {history.slice(0, 20).map((record) => (
              <li
                key={record.id}
                className="flex items-center justify-between text-sm py-1 border-b border-black/5 dark:border-white/10"
              >
                <span>{record.itemName}</span>
                <span>{VERDICT_STYLES[record.verdict].emoji}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-black/40 dark:text-white/40 underline mt-2 self-start"
          >
            Clear history
          </button>
        </div>
      )}
    </div>
  );
}
