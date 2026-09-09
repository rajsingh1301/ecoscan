"use client";

import { useEffect, useState } from "react";
import CameraCapture from "@/components/CameraCapture";
import LocationPicker from "@/components/LocationPicker";
import ShareToCommunity from "@/components/ShareToCommunity";
import { addCleanupRecord, getCleanups, getHistory, getLocation, getStreakDays } from "@/lib/storage";
import { BADGES, getUnlockedBadgeIds } from "@/lib/gamification";
import type { Badge } from "@/lib/gamification";
import type { CleanupVerification, SceneScanResult, UserLocation } from "@/lib/types";

interface VerifyResponse extends CleanupVerification {
  totalItems: number;
  xpEarned: number;
  fullCleanup: boolean;
}

type Screen =
  | "loading"
  | "needs-location"
  | "intro"
  | "before-capture"
  | "scanning"
  | "empty-scene"
  | "quest-active"
  | "after-capture"
  | "verifying"
  | "result"
  | "error";

export default function CleanupPage() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [location, setUserLocation] = useState<UserLocation | null>(null);
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [scene, setScene] = useState<SceneScanResult | null>(null);
  const [verification, setVerification] = useState<VerifyResponse | null>(null);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = getLocation();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUserLocation(stored);
      setScreen("intro");
    } else {
      setScreen("needs-location");
    }
  }, []);

  function requestCoords() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => setCoords({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => setCoords(null),
      { timeout: 5000 }
    );
  }

  function resetQuest() {
    setBeforeImage(null);
    setAfterImage(null);
    setScene(null);
    setVerification(null);
    setNewBadges([]);
    setCoords(null);
    setErrorMessage(null);
    setScreen("intro");
  }

  async function handleBeforeCapture(image: string) {
    if (!location) return;
    setBeforeImage(image);
    setScreen("scanning");

    try {
      const res = await fetch("/api/scene/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, regionKey: location.regionKey }),
      });

      if (!res.ok) throw new Error("Scene scan failed");

      const data = (await res.json()) as SceneScanResult;
      setScene(data);

      if (data.totalItems === 0) {
        setScreen("empty-scene");
        return;
      }

      requestCoords();
      setScreen("quest-active");
    } catch {
      setErrorMessage("Could not analyze that scene. Please try again.");
      setScreen("error");
    }
  }

  async function handleAfterCapture(afterImage: string) {
    if (!beforeImage || !scene) return;
    setAfterImage(afterImage);
    setScreen("verifying");

    try {
      const res = await fetch("/api/scene/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beforeImage, afterImage, items: scene.items }),
      });

      if (!res.ok) throw new Error("Verification failed");

      const data = (await res.json()) as VerifyResponse;

      if (data.sameLocation && data.itemsRemoved > 0) {
        const historyNow = getHistory();
        const badgesBefore = getUnlockedBadgeIds({
          history: historyNow,
          streak: getStreakDays(historyNow),
          cleanups: getCleanups(),
        });

        addCleanupRecord({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          totalItemsBefore: data.totalItems,
          itemsRemoved: data.itemsRemoved,
          xpEarned: data.xpEarned,
          ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
        });

        const badgesAfter = getUnlockedBadgeIds({
          history: historyNow,
          streak: getStreakDays(historyNow),
          cleanups: getCleanups(),
        });

        setNewBadges(BADGES.filter((b) => badgesAfter.has(b.id) && !badgesBefore.has(b.id)));
      }

      setVerification(data);
      setScreen("result");
    } catch {
      setErrorMessage("Could not verify your cleanup. Please try again.");
      setScreen("error");
    }
  }

  if (screen === "loading") return null;

  if (screen === "needs-location") {
    return (
      <div className="flex flex-col items-center gap-6 w-full">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold mb-2">Set your location first 📍</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Cleanup scoring uses your local disposal rules.
          </p>
        </div>
        <LocationPicker
          onSaved={(loc) => {
            setUserLocation(loc);
            setScreen("intro");
          }}
        />
      </div>
    );
  }

  if (screen === "intro") {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-sm text-center">
        <div className="text-5xl">🧹</div>
        <div>
          <h1 className="text-2xl font-bold mb-2">Cleanup Quest</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Find a littered spot, scan it, clean it up — then prove it. The AI compares your
            before and after photos and only awards XP for litter you actually removed.
          </p>
        </div>

        <ol className="text-left text-sm flex flex-col gap-3 w-full">
          <li className="flex gap-3">
            <span className="font-bold text-emerald-600">1.</span>
            <span>Photograph a littered area — AI counts every piece of litter</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-emerald-600">2.</span>
            <span>Clean it up and dispose of everything properly</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-emerald-600">3.</span>
            <span>Photograph the same spot again to earn verified XP</span>
          </li>
        </ol>

        <button
          type="button"
          onClick={() => setScreen("before-capture")}
          className="w-full rounded-full bg-emerald-600 text-white font-medium py-3 active:scale-95 transition"
        >
          Start a Quest
        </button>
      </div>
    );
  }

  if (screen === "before-capture") {
    return (
      <div className="flex flex-col items-center gap-4 w-full">
        <div className="text-center max-w-sm">
          <p className="font-semibold">Step 1 — Before</p>
          <p className="text-sm text-black/60 dark:text-white/60">
            Frame the littered area so all the litter is visible.
          </p>
        </div>
        <CameraCapture onCapture={handleBeforeCapture} label="📸 Scan the area" />
      </div>
    );
  }

  if (screen === "scanning" || screen === "verifying") {
    return (
      <div className="flex flex-col items-center gap-4 mt-16">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-black/60 dark:text-white/60">
          {screen === "scanning" ? "Analyzing the scene…" : "Verifying your cleanup…"}
        </p>
      </div>
    );
  }

  if (screen === "empty-scene") {
    return (
      <div className="flex flex-col items-center gap-4 mt-12 text-center max-w-sm">
        <div className="text-5xl">✨</div>
        <h2 className="text-xl font-bold">Nothing to clean here!</h2>
        <p className="text-sm text-black/60 dark:text-white/60">
          {scene?.note ?? "No litter was detected in this scene."}
        </p>
        <button
          type="button"
          onClick={resetQuest}
          className="rounded-full bg-emerald-600 text-white font-medium px-6 py-3"
        >
          Try another spot
        </button>
      </div>
    );
  }

  if (screen === "quest-active" && scene) {
    return (
      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        <div className="w-full rounded-2xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950 p-5 flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <p className="font-bold text-lg">{scene.totalItems} items detected</p>
            <p className="text-emerald-700 dark:text-emerald-300 font-bold">
              {scene.availableXp} XP
            </p>
          </div>

          <p className="text-sm text-black/60 dark:text-white/60">{scene.note}</p>

          <div className="flex gap-3 text-sm">
            <span>♻️ {scene.recyclableCount} recoverable</span>
            <span>🗑️ {scene.landfillCount} landfill</span>
          </div>

          <ul className="flex flex-col gap-1 border-t border-black/10 dark:border-white/10 pt-3">
            {scene.items.map((item, index) => (
              <li key={`${item.itemName}-${index}`} className="flex justify-between text-sm">
                <span>{item.itemName}</span>
                <span className="font-medium">×{item.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-center text-black/60 dark:text-white/60">
          Now clean it up — then photograph the same spot to claim your XP.
        </p>

        <button
          type="button"
          onClick={() => setScreen("after-capture")}
          className="w-full rounded-full bg-emerald-600 text-white font-medium py-3 active:scale-95 transition"
        >
          I&apos;ve cleaned it — verify
        </button>
        <button
          type="button"
          onClick={resetQuest}
          className="text-sm text-black/40 dark:text-white/40 underline"
        >
          Abandon quest
        </button>
      </div>
    );
  }

  if (screen === "after-capture") {
    return (
      <div className="flex flex-col items-center gap-4 w-full">
        <div className="text-center max-w-sm">
          <p className="font-semibold">Step 3 — After</p>
          <p className="text-sm text-black/60 dark:text-white/60">
            Photograph the same spot from roughly the same angle.
          </p>
        </div>
        <CameraCapture onCapture={handleAfterCapture} label="📸 Verify cleanup" />
      </div>
    );
  }

  if (screen === "error") {
    return (
      <div className="flex flex-col items-center gap-4 mt-16 text-center">
        <p className="text-sm text-red-600">{errorMessage}</p>
        <button
          type="button"
          onClick={resetQuest}
          className="rounded-full bg-emerald-600 text-white font-medium px-6 py-3"
        >
          Start over
        </button>
      </div>
    );
  }

  if (screen === "result" && verification) {
    const failed = !verification.sameLocation;

    return (
      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        <div
          className={`w-full rounded-2xl border-2 p-6 flex flex-col gap-3 ${
            failed
              ? "border-orange-500 bg-orange-50 dark:bg-orange-950"
              : "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
          }`}
        >
          {failed ? (
            <>
              <p className="text-2xl font-bold">⚠️ Couldn&apos;t verify</p>
              <p className="text-sm">
                The after photo doesn&apos;t appear to show the same place as the before photo, so
                no XP was awarded.
              </p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                {verification.fullCleanup ? "✨ Spotless!" : "✅ Verified"}
              </p>
              <p className="text-sm">
                {verification.itemsRemoved} of {verification.totalItems} items removed
                {verification.itemsRemaining > 0 && ` · ${verification.itemsRemaining} still there`}
              </p>
              <p className="text-2xl font-bold">+{verification.xpEarned} XP</p>
              {verification.fullCleanup && (
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Includes a full-cleanup bonus 🎉
                </p>
              )}
            </>
          )}

          <p className="text-xs text-black/50 dark:text-white/50 border-t border-black/10 dark:border-white/10 pt-3">
            {verification.notes}
            {verification.confidence === "low" && " (assessed with low confidence)"}
          </p>
        </div>

        {newBadges.length > 0 && (
          <div className="w-full rounded-lg bg-amber-100 dark:bg-amber-900 border border-amber-400 p-3 flex flex-col gap-1">
            <p className="text-sm font-bold">🎉 New Badge Unlocked!</p>
            {newBadges.map((badge) => (
              <p key={badge.id} className="text-sm">
                {badge.emoji} {badge.name} — {badge.description}
              </p>
            ))}
          </div>
        )}

        {!failed && beforeImage && afterImage && (
          <ShareToCommunity
            prompt="Show your work to the community 🌍"
            post={{
              type: "cleanup",
              beforeImage,
              afterImage,
              itemsRemoved: verification.itemsRemoved,
              xpEarned: verification.xpEarned,
            }}
          />
        )}

        <button
          type="button"
          onClick={resetQuest}
          className="w-full rounded-full bg-emerald-600 text-white font-medium py-3 active:scale-95 transition"
        >
          Start another quest
        </button>
      </div>
    );
  }

  return null;
}
