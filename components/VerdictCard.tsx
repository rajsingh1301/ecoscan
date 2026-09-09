"use client";

import { useState } from "react";
import { VERDICT_STYLES } from "@/lib/verdictStyles";
import { VERDICTS } from "@/lib/types";
import type { Verdict } from "@/lib/types";
import type { Badge } from "@/lib/gamification";

interface VerdictCardProps {
  itemName: string;
  verdict: Verdict;
  reason: string;
  confidence: "high" | "medium" | "low";
  xpGained?: number;
  newBadges?: Badge[];
  onOverride?: (verdict: Verdict) => void;
  onScanAgain: () => void;
}

export default function VerdictCard({
  itemName,
  verdict,
  reason,
  confidence,
  xpGained,
  newBadges,
  onOverride,
  onScanAgain,
}: VerdictCardProps) {
  const [overriding, setOverriding] = useState(false);
  const style = VERDICT_STYLES[verdict];

  return (
    <div className={`w-full max-w-sm rounded-2xl border-2 ${style.border} ${style.bg} p-6 flex flex-col gap-4`}>
      {typeof xpGained === "number" && xpGained > 0 && (
        <div className="self-start rounded-full bg-emerald-600 text-white text-xs font-bold px-3 py-1 animate-bounce">
          +{xpGained} XP
        </div>
      )}

      {newBadges && newBadges.length > 0 && (
        <div className="rounded-lg bg-amber-100 dark:bg-amber-900 border border-amber-400 p-3 flex flex-col gap-1">
          <p className="text-sm font-bold">🎉 New Badge Unlocked!</p>
          {newBadges.map((badge) => (
            <p key={badge.id} className="text-sm">
              {badge.emoji} {badge.name} — {badge.description}
            </p>
          ))}
        </div>
      )}

      <div>
        <p className="text-sm text-black/50 dark:text-white/50">{itemName}</p>
        <p className={`text-3xl font-bold ${style.text} flex items-center gap-2 mt-1`}>
          <span>{style.emoji}</span>
          {style.label}
        </p>
      </div>

      <p className="text-sm leading-relaxed">{reason}</p>

      {confidence === "low" && (
        <div className="rounded-lg bg-black/5 dark:bg-white/10 p-3 text-sm">
          <p className="font-medium mb-2">
            ⚠️ Not fully sure about this one. Pick the correct category if this looks wrong:
          </p>
          {!overriding ? (
            <button
              type="button"
              onClick={() => setOverriding(true)}
              className="underline font-medium"
            >
              Correct this
            </button>
          ) : (
            <div className="flex flex-wrap gap-2 mt-2">
              {VERDICTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    onOverride?.(v);
                    setOverriding(false);
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${VERDICT_STYLES[v].border} ${VERDICT_STYLES[v].text}`}
                >
                  {VERDICT_STYLES[v].emoji} {VERDICT_STYLES[v].label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onScanAgain}
        className="rounded-full border border-black/10 dark:border-white/20 py-3 font-medium active:scale-95 transition"
      >
        Scan another item
      </button>
    </div>
  );
}
