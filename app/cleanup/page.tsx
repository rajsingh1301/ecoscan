"use client";

import { useEffect, useState } from "react";
import CameraCapture from "@/components/CameraCapture";
import LocationPicker from "@/components/LocationPicker";
import ShareToCommunity from "@/components/ShareToCommunity";
import { addCleanupRecord, getCleanups, getHistory, getLocation, getStreakDays } from "@/lib/storage";
import { BADGES, CLEANUP_FULL_BONUS, getUnlockedBadgeIds } from "@/lib/gamification";
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
      <div className="shell flex flex-col gap-7 fade-up">
        <div className="flex flex-col gap-3">
          <span className="eyebrow">One thing first</span>
          <h1 className="display text-[2rem]">Where are you cleaning?</h1>
          <p className="text-[0.95rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            Cleanup scoring uses your local disposal rules to work out what can
            be recovered and what can&apos;t.
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
      <div className="shell flex flex-col gap-7 fade-up">
        <div className="flex flex-col gap-3">
          <span className="eyebrow">Cleanup Quest</span>
          <h1 className="display text-[2.1rem]">Anyone can say they cleaned up.</h1>
          <p className="text-[0.95rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            Photograph a littered spot and the AI counts every piece. Clear it,
            photograph it again, and it awards XP only for what genuinely went
            away — checked against your first photo.
          </p>
        </div>

        <div className="steps">
          <div className="step">
            <p>Photograph the mess — every piece of litter gets counted</p>
          </div>
          <div className="step">
            <p>Clear it, and dispose of everything properly</p>
          </div>
          <div className="step">
            <p>Photograph the same spot to claim verified XP</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setScreen("before-capture")}
          className="btn btn-primary"
        >
          Start a quest
        </button>
      </div>
    );
  }

  if (screen === "before-capture") {
    return (
      <div className="shell flex flex-col gap-5 fade-up">
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow">Step 1 · Before</span>
          <h1 className="display text-[1.7rem]">Frame the whole mess.</h1>
          <p className="text-[0.88rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            Anything outside the shot won&apos;t be counted — and won&apos;t earn XP later.
          </p>
        </div>
        <CameraCapture onCapture={handleBeforeCapture} label="Scan the area" />
      </div>
    );
  }

  if (screen === "scanning" || screen === "verifying") {
    return (
      <div className="shell flex flex-col items-center gap-4 pt-24 text-center">
        <div className="spinner" />
        <p className="text-[0.9rem]" style={{ color: "var(--ink-soft)" }}>
          {screen === "scanning"
            ? "Counting what's there…"
            : "Comparing your two photos…"}
        </p>
      </div>
    );
  }

  if (screen === "empty-scene") {
    return (
      <div className="shell flex flex-col gap-5 pt-10 fade-up">
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Nothing found</span>
          <h1 className="display text-[2rem]">This spot is already clean.</h1>
          <p className="text-[0.9rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            {scene?.note ?? "No litter was detected in this scene."}
          </p>
        </div>
        <button type="button" onClick={resetQuest} className="btn btn-primary">
          Try another spot
        </button>
      </div>
    );
  }

  if (screen === "quest-active" && scene) {
    return (
      <div className="shell flex flex-col gap-5 fade-up">
        <div className="tally">
          <div className="flex flex-col gap-1">
            <span className="eyebrow">Detected</span>
            <p className="tally-figure">
              {scene.totalItems}
              <span className="text-[1rem] font-normal" style={{ color: "var(--ink-faint)" }}>
                {" "}
                {scene.totalItems === 1 ? "piece" : "pieces"}
              </span>
            </p>
          </div>

          <div className="tally-split">
            <span>
              <b>{scene.recyclableCount}</b> recoverable
            </span>
            <span>
              <b>{scene.landfillCount}</b> landfill
            </span>
          </div>

          <div className="item-list">
            {scene.items.map((item, index) => (
              <div key={`${item.itemName}-${index}`} className="item-line">
                <span>{item.itemName}</span>
                <span>×{item.count}</span>
              </div>
            ))}
          </div>

          <span className="xp-available">{scene.availableXp} XP on the table</span>
        </div>

        <p className="text-[0.9rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          Clear it, then photograph the same spot. XP is awarded only for what
          actually leaves the frame.
        </p>

        <button
          type="button"
          onClick={() => setScreen("after-capture")}
          className="btn btn-primary"
        >
          I&apos;ve cleaned it
        </button>
        <button
          type="button"
          onClick={resetQuest}
          className="text-[0.82rem] underline underline-offset-2 self-center"
          style={{ color: "var(--ink-faint)" }}
        >
          Abandon quest
        </button>
      </div>
    );
  }

  if (screen === "after-capture") {
    return (
      <div className="shell flex flex-col gap-5 fade-up">
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow">Step 3 · After</span>
          <h1 className="display text-[1.7rem]">Same spot, same angle.</h1>
          <p className="text-[0.88rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            The closer the framing matches your first photo, the more confidently
            it can credit what you removed.
          </p>
        </div>
        <CameraCapture onCapture={handleAfterCapture} label="Verify cleanup" />
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
        <button type="button" onClick={resetQuest} className="btn btn-primary">
          Start over
        </button>
      </div>
    );
  }

  if (screen === "result" && verification) {
    const failed = !verification.sameLocation;

    return (
      <div className="shell flex flex-col gap-4 fade-up">
        <article className="outcome" data-state={failed ? "rejected" : "verified"}>
          {failed ? (
            <>
              <div className="flex flex-col gap-1.5">
                <span className="eyebrow">No XP awarded</span>
                <h1 className="outcome-headline">This isn&apos;t the same place.</h1>
              </div>
              <p className="text-[0.9rem] leading-relaxed">
                The second photo doesn&apos;t match the spot you scanned, so the
                cleanup couldn&apos;t be credited.
              </p>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <span className="eyebrow">
                  {verification.fullCleanup ? "Every piece gone" : "Verified"}
                </span>
                <h1 className="outcome-headline">+{verification.xpEarned} XP</h1>
              </div>

              <div className="score-line">
                <span style={{ color: "var(--ink-soft)" }}>Removed</span>
                <b>
                  {verification.itemsRemoved} of {verification.totalItems}
                </b>
              </div>

              {verification.itemsRemaining > 0 && (
                <div className="score-line">
                  <span style={{ color: "var(--ink-soft)" }}>Still there</span>
                  <b>{verification.itemsRemaining}</b>
                </div>
              )}

              {verification.fullCleanup && (
                <div className="score-line">
                  <span style={{ color: "var(--ink-soft)" }}>Full-cleanup bonus</span>
                  <b>+{CLEANUP_FULL_BONUS}</b>
                </div>
              )}
            </>
          )}

          <p className="outcome-note">
            {verification.notes}
            {verification.confidence === "low" && " Assessed with low confidence."}
          </p>
        </article>

        {newBadges.length > 0 && (
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

        {!failed && beforeImage && afterImage && (
          <ShareToCommunity
            prompt="Show the community what you did"
            post={{
              type: "cleanup",
              beforeImage,
              afterImage,
              itemsRemoved: verification.itemsRemoved,
              xpEarned: verification.xpEarned,
            }}
          />
        )}

        <button type="button" onClick={resetQuest} className="btn btn-quiet">
          Start another quest
        </button>
      </div>
    );
  }

  return null;
}
