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
  const [correcting, setCorrecting] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <article className="verdict" data-stream={verdict}>
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow">{itemName}</span>
          <h1 className="verdict-word">{VERDICT_STYLES[verdict].label}</h1>
        </div>

        <p className="verdict-reason">{reason}</p>

        {typeof xpGained === "number" && xpGained > 0 && (
          <span className="xp-tick">+{xpGained} XP</span>
        )}
      </article>

      {confidence === "low" && (
        <div className="unsure">
          <p className="text-[0.85rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            <span style={{ color: "var(--ink)", fontWeight: 600 }}>Not certain about this one.</span>{" "}
            If the answer looks wrong, set it yourself — your correction is what gets saved.
          </p>

          {!correcting ? (
            <button
              type="button"
              onClick={() => setCorrecting(true)}
              className="self-start text-[0.85rem] font-semibold underline underline-offset-2"
              style={{ color: "var(--moss)" }}
            >
              Correct it
            </button>
          ) : (
            <div className="chip-row">
              {VERDICTS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onOverride?.(option);
                    setCorrecting(false);
                  }}
                  className="chip"
                >
                  {VERDICT_STYLES[option].label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {newBadges && newBadges.length > 0 && (
        <div className="celebrate">
          <span className="eyebrow">Badge unlocked</span>
          {newBadges.map((badge) => (
            <p key={badge.id} className="text-[0.9rem] font-semibold">
              {badge.name}
              <span className="font-normal" style={{ color: "var(--ink-soft)" }}>
                {" "}
                — {badge.description.toLowerCase()}
              </span>
            </p>
          ))}
        </div>
      )}

      <button type="button" onClick={onScanAgain} className="btn btn-quiet">
        Scan something else
      </button>
    </div>
  );
}
