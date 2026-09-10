"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import RankCard from "@/components/RankCard";
import type { User } from "@supabase/supabase-js";
import LocationPicker from "@/components/LocationPicker";
import Avatar from "@/components/Avatar";
import StreakCalendar from "@/components/StreakCalendar";
import DailyChallengeCard from "@/components/DailyChallengeCard";
import BadgeGrid from "@/components/BadgeGrid";
import ImpactDashboard from "@/components/ImpactDashboard";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  AVATAR_CHOICES,
  getProfile,
  signOut,
  updateProfile,
  type Profile,
} from "@/lib/community";
import { getCleanups, getHistory, getLocation, getStreakDays } from "@/lib/storage";
import { BADGES, computeTotalXp, getUnlockedBadgeIds } from "@/lib/gamification";
import type { CleanupRecord, ScanRecord, UserLocation } from "@/lib/types";

type AuthState = "checking" | "signed-in";

export default function ProfilePage() {
  const configured = isSupabaseConfigured();

  const [authState, setAuthState] = useState<AuthState>("checking");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [cleanups, setCleanups] = useState<CleanupRecord[]>([]);
  const [location, setUserLocation] = useState<UserLocation | null>(null);

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftAvatar, setDraftAvatar] = useState(AVATAR_CHOICES[0]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingLocation, setEditingLocation] = useState(false);

  const loadLocal = useCallback(() => {
    setHistory(getHistory());
    setCleanups(getCleanups());
    setUserLocation(getLocation());
  }, []);

  const loadAccount = useCallback(async () => {
    const { data } = await createClient().auth.getUser();
    const current = data.user ?? null;
    setUser(current);

    if (current) {
      const found = await getProfile(current.id);
      setProfile(found);
      setDraftName(found?.username ?? "");
      setDraftAvatar(found?.avatar_emoji ?? AVATAR_CHOICES[0]);
      setAuthState("signed-in");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLocal();
    if (configured) void loadAccount();
  }, [configured, loadLocal, loadAccount]);

  const xp = computeTotalXp(history, cleanups);
  const streak = getStreakDays(history);
  const litterRemoved = cleanups.reduce((sum, c) => sum + c.itemsRemoved, 0);
  const badgeCount = getUnlockedBadgeIds({ history, streak, cleanups }).size;

  async function handleSaveProfile() {
    if (!user) return;
    const name = draftName.trim();
    if (!name) {
      setNotice("Enter a display name.");
      return;
    }

    setSaving(true);
    const result = await updateProfile(user.id, { username: name, avatar_emoji: draftAvatar });
    setSaving(false);

    if (result.ok) {
      setProfile((prev) => (prev ? { ...prev, username: name, avatar_emoji: draftAvatar } : prev));
      setEditing(false);
      setNotice("Saved.");
    } else {
      setNotice(result.error ?? "Could not save.");
    }
  }

  async function handleSignOut() {
    // The route guard sees the session end and sends us to /login, so there is
    // no local state to unwind here.
    await signOut();
  }

  return (
    <div className="shell flex flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <span className="eyebrow">Profile</span>
        <h1 className="display text-[2rem]">
          {authState === "signed-in" ? (profile?.username ?? "You") : "You"}
        </h1>
      </div>

      {/* Identity */}
      {authState === "signed-in" && user && (
        <section className="flex flex-col gap-3.5">
          {!editing ? (
            <>
              <div className="identity">
                <Avatar
                  seed={profile?.username ?? user.id}
                  emoji={profile?.avatar_emoji ?? "🌱"}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[1rem] font-semibold truncate">
                    {profile?.username ?? "Your account"}
                  </p>
                  <p className="text-[0.8rem] truncate" style={{ color: "var(--ink-faint)" }}>
                    {user.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-[0.83rem] font-semibold underline underline-offset-2 self-start"
                style={{ color: "var(--moss)" }}
              >
                Edit name and avatar
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="identity">
                <Avatar seed={draftName || "preview"} emoji={draftAvatar} size="lg" />
                <p className="text-[0.82rem]" style={{ color: "var(--ink-faint)" }}>
                  Your colour comes from your name — pick a symbol below.
                </p>
              </div>
              <div className="avatar-picker">
                {AVATAR_CHOICES.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    aria-pressed={draftAvatar === emoji}
                    onClick={() => setDraftAvatar(emoji)}
                    className="avatar-option"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                maxLength={40}
                placeholder="Display name"
                className="field"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setDraftName(profile?.username ?? "");
                    setDraftAvatar(profile?.avatar_emoji ?? AVATAR_CHOICES[0]);
                  }}
                  className="btn btn-quiet"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {notice && (
            <p className="text-[0.8rem]" style={{ color: "var(--ink-faint)" }}>
              {notice}
            </p>
          )}
        </section>
      )}

      <RankCard xp={xp} />

      <Link
        href="/ranks"
        className="text-[0.83rem] font-semibold underline underline-offset-2 self-start"
        style={{ color: "var(--moss)" }}
      >
        See the leaderboards
      </Link>

      <DailyChallengeCard />

      <StreakCalendar />

      {/* Stats */}
      <section className="flex flex-col gap-2.5">
        <div className="rule-label">
          <span className="eyebrow">Totals</span>
        </div>
        <div className="flex flex-col">
          <div className="stat-row">
            <span style={{ color: "var(--ink-soft)" }}>Total XP</span>
            <b>{xp}</b>
          </div>
          <div className="stat-row">
            <span style={{ color: "var(--ink-soft)" }}>Items scanned</span>
            <b>{history.length}</b>
          </div>
          <div className="stat-row">
            <span style={{ color: "var(--ink-soft)" }}>Cleanups verified</span>
            <b>{cleanups.length}</b>
          </div>
          <div className="stat-row">
            <span style={{ color: "var(--ink-soft)" }}>Litter removed</span>
            <b>{litterRemoved}</b>
          </div>
          <div className="stat-row">
            <span style={{ color: "var(--ink-soft)" }}>Badges</span>
            <b>
              {badgeCount}/{BADGES.length}
            </b>
          </div>
        </div>
      </section>

      <ImpactDashboard />

      <BadgeGrid />

      {/* Location */}
      <section className="flex flex-col gap-2.5">
        <div className="rule-label">
          <span className="eyebrow">Location</span>
        </div>
        {!editingLocation ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.9rem]">{location?.label ?? "Not set"}</p>
            <button
              type="button"
              onClick={() => setEditingLocation(true)}
              className="text-[0.83rem] font-semibold underline underline-offset-2"
              style={{ color: "var(--moss)" }}
            >
              Change
            </button>
          </div>
        ) : (
          <LocationPicker
            currentRegionKey={location?.regionKey}
            onSaved={(loc) => {
              setUserLocation(loc);
              setEditingLocation(false);
              if (user) void updateProfile(user.id, { city: loc.regionKey });
            }}
          />
        )}
      </section>

      {/* Account */}
      <section className="flex flex-col gap-2.5">
        <div className="rule-label">
          <span className="eyebrow">Account</span>
        </div>

        {!configured && (
          <p className="text-[0.85rem]" style={{ color: "var(--ink-soft)" }}>
            Accounts aren&apos;t configured for this deployment.
          </p>
        )}

        {configured && authState === "signed-in" && (
          <>
            <p className="text-[0.85rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
              Your progress is saved to this account. Sign in on any device to pick
              up where you left off.
            </p>
            <button
              type="button"
              onClick={handleSignOut}
              className="btn btn-quiet self-start"
            >
              Sign out
            </button>
          </>
        )}

      </section>
    </div>
  );
}
