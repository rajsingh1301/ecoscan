"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CameraCapture from "@/components/CameraCapture";
import LocationPicker from "@/components/LocationPicker";
import VerdictCard from "@/components/VerdictCard";
import DailyChallengeCard from "@/components/DailyChallengeCard";
import ShareToCommunity from "@/components/ShareToCommunity";
import { addScanRecord, getCleanups, getHistory, getLocation, getStreakDays } from "@/lib/storage";
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

type Screen = "loading" | "needs-location" | "camera" | "identifying" | "result" | "error";

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
    const stored = getLocation();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUserLocation(stored);
      setScreen("camera");
    } else {
      setScreen("needs-location");
    }
  }, []);

  function handleLocationSaved(loc: UserLocation) {
    setUserLocation(loc);
    setScreen("camera");
  }

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

      addScanRecord({
        id,
        timestamp: new Date().toISOString(),
        itemName: data.itemName,
        materialCategory: data.materialCategory,
        verdict: data.verdict,
        confidence: data.confidence,
      });

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
      addScanRecord({
        id: scanId,
        timestamp: new Date().toISOString(),
        itemName: updated.itemName,
        materialCategory: updated.materialCategory,
        verdict: newVerdict,
        confidence: updated.confidence,
      });
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

  if (screen === "needs-location") {
    return (
      <div className="flex flex-col items-center gap-6 w-full">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold mb-2">Welcome to EcoScan 🌎</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Disposal rules vary by location. Set yours to get accurate guidance.
          </p>
        </div>
        <LocationPicker onSaved={handleLocationSaved} />
      </div>
    );
  }

  if (screen === "camera") {
    return (
      <div className="flex flex-col items-center gap-4 w-full">
        <p className="text-sm text-black/50 dark:text-white/50">
          Scanning for: <span className="font-medium">{location?.label}</span>
        </p>
        <div className="w-full max-w-sm">
          <DailyChallengeCard />
        </div>
        <CameraCapture onCapture={handleCapture} />
        <Link
          href="/cleanup"
          className="w-full max-w-sm rounded-xl border border-emerald-500 text-emerald-700 dark:text-emerald-300 py-3 text-center text-sm font-medium"
        >
          🧹 Start a Cleanup Quest instead
        </Link>
      </div>
    );
  }

  if (screen === "identifying") {
    return (
      <div className="flex flex-col items-center gap-4 mt-16">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-black/60 dark:text-white/60">Identifying item…</p>
      </div>
    );
  }

  if (screen === "error") {
    return (
      <div className="flex flex-col items-center gap-4 mt-16 text-center">
        <p className="text-sm text-red-600">{errorMessage}</p>
        <button
          type="button"
          onClick={handleScanAgain}
          className="rounded-full bg-emerald-600 text-white font-medium px-6 py-3"
        >
          Try again
        </button>
      </div>
    );
  }

  if (screen === "result" && result) {
    return (
      <div className="flex flex-col items-center gap-4 w-full">
        {result.mock && (
          <p className="text-xs text-center text-black/40 dark:text-white/40 max-w-sm">
            Demo mode — using mock identification. Real Claude (Bedrock) integration pending API key.
          </p>
        )}
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
          <div className="w-full max-w-sm">
            <ShareToCommunity
              prompt={`Share your "${newBadges[0].name}" badge?`}
              post={{ type: "badge", badgeId: newBadges[0].id }}
            />
          </div>
        )}
      </div>
    );
  }

  return null;
}
