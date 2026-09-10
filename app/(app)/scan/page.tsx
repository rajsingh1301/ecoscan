"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CameraCapture from "@/components/CameraCapture";
import VerdictCard from "@/components/VerdictCard";
import DailyChallengeCard from "@/components/DailyChallengeCard";
import ShareToCommunity from "@/components/ShareToCommunity";
import { addScanRecord, getCleanups, getHistory, getLocation, getStreakDays } from "@/lib/storage";
import { pushScan } from "@/lib/sync";
import { getReasonForVerdict } from "@/lib/rulesEngine";
import { BADGES, XP_TABLE, getUnlockedBadgeIds } from "@/lib/gamification";
import type { Badge } from "@/lib/gamification";
import type { UserLocation, Verdict, ConfidenceLevel, MaterialCategory } from "@/lib/types";

interface IdentifyResponse {
  itemName: string;
  materialCategory: MaterialCategory;
  confidence: ConfidenceLevel;
  verdict: Verdict;
  reason: string;
  mock: boolean;
}

type Screen = "loading" | "camera" | "identifying" | "result" | "error";

export default function ScanPage() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [location, setUserLocation] = useState<UserLocation | null>(null);
  const [result, setResult] = useState<IdentifyResponse | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [xpGained, setXpGained] = useState(0);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);

  useEffect(() => {
    // localStorage is only available client-side; reading it post-mount (not
    // during render) is the standard Next.js pattern to avoid SSR mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUserLocation(getLocation());
    setScreen("camera");
  }, []);

  async function handleCapture(base64Image: string) {
    if (!location) return;
    setScreen("identifying");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image, regionKey: location.regionKey }),
      });

      if (!res.ok) {
        throw new Error("Identification failed");
      }

      const data = (await res.json()) as IdentifyResponse;
      const id = crypto.randomUUID();

      const cleanups = getCleanups();
      const historyBefore = getHistory();
      const badgesBefore = getUnlockedBadgeIds({
        history: historyBefore,
        streak: getStreakDays(historyBefore),
        cleanups,
      });

      const record = {
        id,
        timestamp: new Date().toISOString(),
        itemName: data.itemName,
        materialCategory: data.materialCategory,
        verdict: data.verdict,
        confidence: data.confidence,
      };
      addScanRecord(record);
      void pushScan(record).catch(() => {});

      const historyAfter = getHistory();
      const badgesAfter = getUnlockedBadgeIds({
        history: historyAfter,
        streak: getStreakDays(historyAfter),
        cleanups,
      });
      const unlockedNow = BADGES.filter((badge) => badgesAfter.has(badge.id) && !badgesBefore.has(badge.id));

      setXpGained(XP_TABLE[data.verdict]);
      setNewBadges(unlockedNow);
      setResult(data);
      setScanId(id);
      setScreen("result");
    } catch {
      setErrorMessage("Something went wrong identifying that item. Please try again.");
      setScreen("error");
    }
  }

  function handleOverride(newVerdict: Verdict) {
    if (!result) return;
    const updated: IdentifyResponse = {
      ...result,
      verdict: newVerdict,
      reason: getReasonForVerdict(result.materialCategory, newVerdict),
    };
    setResult(updated);
    setXpGained(XP_TABLE[newVerdict]);

    if (scanId) {
      const corrected = {
        id: scanId,
        timestamp: new Date().toISOString(),
        itemName: updated.itemName,
        materialCategory: updated.materialCategory,
        verdict: newVerdict,
        confidence: updated.confidence,
      };
      addScanRecord(corrected);
      void pushScan(corrected).catch(() => {});
    }
  }

  function handleScanAgain() {
    setResult(null);
    setScanId(null);
    setXpGained(0);
    setNewBadges([]);
    setScreen("camera");
  }

  if (screen === "loading") {
    return null;
  }

  if (screen === "camera") {
    return (
      <div className="shell flex flex-col gap-6 fade-up">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="eyebrow">{location?.label}</span>
            <Link
              href="/profile"
              className="eyebrow underline underline-offset-2"
              style={{ color: "var(--ink-faint)" }}
            >
              Change
            </Link>
          </div>
          <h1 className="display text-[1.85rem]">What are you throwing away?</h1>
        </div>

        <CameraCapture onCapture={handleCapture} />

        <DailyChallengeCard />

        <Link href="/cleanup" className="quest-link">
          <span className="flex flex-col gap-0.5">
            <span className="text-[0.95rem] font-semibold">Clean a whole place</span>
            <span className="text-[0.8rem]" style={{ color: "var(--ink-soft)" }}>
              Scan the mess, clear it, prove it
            </span>
          </span>
          <svg
            className="quest-link-arrow"
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3.5 9h11m0 0-4-4m4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    );
  }

  if (screen === "identifying") {
    return (
      <div className="shell flex flex-col items-center gap-4 pt-24 text-center">
        <div className="spinner" />
        <p className="text-[0.9rem]" style={{ color: "var(--ink-soft)" }}>
          Working out what this is…
        </p>
      </div>
    );
  }

  if (screen === "error") {
    return (
      <div className="shell flex flex-col items-center gap-5 pt-24 text-center fade-up">
        <span className="eyebrow">Didn&apos;t work</span>
        <p className="text-[0.95rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          {errorMessage}
        </p>
        <button type="button" onClick={handleScanAgain} className="btn btn-primary">
          Try again
        </button>
      </div>
    );
  }

  if (screen === "result" && result) {
    return (
      <div className="shell flex flex-col gap-4 fade-up">
        <VerdictCard
          itemName={result.itemName}
          verdict={result.verdict}
          reason={result.reason}
          confidence={result.confidence}
          xpGained={xpGained}
          newBadges={newBadges}
          onOverride={handleOverride}
          onScanAgain={handleScanAgain}
        />

        {newBadges.length > 0 && (
          <ShareToCommunity
            prompt={`Share your "${newBadges[0].name}" badge?`}
            post={{ type: "badge", badgeId: newBadges[0].id }}
          />
        )}
      </div>
    );
  }

  return null;
}
