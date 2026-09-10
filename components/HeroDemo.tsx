"use client";

import { useEffect, useState } from "react";

/**
 * Fixed positions so the server and client render the same scene. Sized as a
 * share of the scene rather than in pixels, so the pieces still read as litter
 * on a phone.
 */
const LITTER = [
  { x: 10, y: 52, w: 6.5, h: 20, r: 30, tint: "var(--recycle)", label: "Bottle" },
  { x: 25, y: 70, w: 5.5, h: 13, r: 22, tint: "var(--dropoff)", label: "Can" },
  { x: 40, y: 46, w: 9, h: 7, r: 18, tint: "var(--compost)", label: "Wrapper" },
  { x: 55, y: 74, w: 6.5, h: 18, r: 28, tint: "var(--recycle)", label: "Bottle" },
  { x: 34, y: 60, w: 5, h: 9, r: 20, tint: "var(--landfill)", label: "Cup" },
  { x: 70, y: 55, w: 8.5, h: 7, r: 16, tint: "var(--dropoff)", label: "Wrapper" },
  { x: 80, y: 72, w: 5.5, h: 14, r: 24, tint: "var(--compost)", label: "Can" },
  { x: 62, y: 40, w: 5, h: 8, r: 20, tint: "var(--landfill)", label: "Cup" },
];

const TOTAL = LITTER.length;
const XP_PER_ITEM = 20;
const FULL_BONUS = 50;

type Phase = "before" | "clearing" | "verified";

export default function HeroDemo() {
  const [phase, setPhase] = useState<Phase>("before");

  useEffect(() => {
    if (phase !== "clearing") return;
    const timer = setTimeout(() => setPhase("verified"), 1100);
    return () => clearTimeout(timer);
  }, [phase]);

  const cleared = phase !== "before";

  return (
    <figure className="hero-demo">
      <div className="hero-scene">
        <span className="hero-scene-tag">{cleared ? "After" : "Before"}</span>

        <span className="hero-ground" aria-hidden="true" />

        {LITTER.map((item, index) => (
          <span
            key={`${item.label}-${index}`}
            className={`hero-litter${cleared ? " is-gone" : ""}`}
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              width: `${item.w}%`,
              height: `${item.h}%`,
              borderRadius: `${item.r}%`,
              background: `color-mix(in srgb, ${item.tint} 82%, var(--surface))`,
              transitionDelay: `${index * 80}ms`,
            }}
            aria-hidden="true"
          />
        ))}

        {phase === "verified" && (
          <span className="hero-stamp">
            Verified · {TOTAL} removed · +{TOTAL * XP_PER_ITEM + FULL_BONUS} XP
          </span>
        )}
      </div>

      <figcaption className="hero-readout">
        <span className="tabular">
          {phase === "before"
            ? `${TOTAL} pieces detected · ${TOTAL * XP_PER_ITEM} XP available`
            : phase === "clearing"
              ? "Comparing your two photos…"
              : `${TOTAL} of ${TOTAL} gone · full-cleanup bonus`}
        </span>

        <button
          type="button"
          onClick={() => setPhase(phase === "before" ? "clearing" : "before")}
          className="btn btn-quiet hero-demo-btn"
          disabled={phase === "clearing"}
        >
          {phase === "before" ? "Clear the area" : phase === "clearing" ? "Checking…" : "Run it again"}
        </button>
      </figcaption>
    </figure>
  );
}
