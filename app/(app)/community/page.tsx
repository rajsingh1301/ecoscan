"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import PostCard from "@/components/PostCard";
import JoinCommunity from "@/components/JoinCommunity";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  ensureProfile,
  fetchCityLeaderboard,
  fetchFeed,
  getMyReactedPostIds,
  signOut,
  toggleReaction,
} from "@/lib/community";
import { getLocation } from "@/lib/storage";
import { DEMO_REGIONS } from "@/lib/rulesEngine";
import type { FeedPost } from "@/lib/types";

type Tab = "city" | "global" | "leaderboard";

export default function CommunityPage() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [city, setCity] = useState<string>("default");
  const [tab, setTab] = useState<Tab>("global");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [reactedIds, setReactedIds] = useState<Set<string>>(new Set());
  const [leaderboard, setLeaderboard] = useState<{ city: string; itemsRemoved: number; posts: number }[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReady(true);
      return;
    }

    const supabase = createClient();
    const storedCity = getLocation()?.regionKey ?? "default";

    async function init() {
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user ?? null;
      if (currentUser) await ensureProfile(currentUser, storedCity);
      setCity(storedCity);
      setUser(currentUser);
      setReady(true);
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, [configured]);

  const loadFeed = useCallback(async () => {
    if (!configured) return;
    setLoadingFeed(true);

    if (tab === "leaderboard") {
      setLeaderboard(await fetchCityLeaderboard());
    } else {
      const data = await fetchFeed(tab === "city" ? city : null);
      setPosts(data);
      if (user) setReactedIds(await getMyReactedPostIds(user.id));
    }

    setLoadingFeed(false);
  }, [configured, tab, city, user]);

  useEffect(() => {
    // Fetching the feed when the tab or auth state changes is exactly what this
    // effect is for; the loading flag it sets is part of that fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ready) loadFeed();
  }, [ready, loadFeed]);

  async function handleToggleReaction(post: FeedPost, reacted: boolean) {
    if (!user) return;
    const ok = await toggleReaction(user.id, post.id, reacted);
    if (!ok) return;

    setReactedIds((prev) => {
      const next = new Set(prev);
      if (reacted) next.delete(post.id);
      else next.add(post.id);
      return next;
    });

    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id ? { ...p, reaction_count: p.reaction_count + (reacted ? -1 : 1) } : p
      )
    );
  }

  if (!ready) return null;

  if (!configured) {
    return (
      <div className="max-w-sm text-center mt-12 flex flex-col gap-3">
        <div className="text-4xl">🌍</div>
        <h1 className="text-xl font-bold">Community isn&apos;t configured</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to enable the feed.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Community</h1>
        {user && (
          <button
            type="button"
            onClick={async () => {
              await signOut();
              setUser(null);
            }}
            className="text-xs text-black/50 dark:text-white/50 underline"
          >
            Leave
          </button>
        )}
      </div>

      <div className="flex gap-1 rounded-full border border-black/10 dark:border-white/20 p-1 text-sm">
        {(
          [
            ["city", DEMO_REGIONS.find((r) => r.key === city)?.label.split(",")[0] ?? "My city"],
            ["global", "Global"],
            ["leaderboard", "Cities"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 rounded-full py-1.5 font-medium transition ${
              tab === key ? "bg-emerald-600 text-white" : ""
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!user && (
        <JoinCommunity
          prompt="Join to share your cleanups and cheer others on"
          onJoined={async () => {
            const { data } = await createClient().auth.getUser();
            setUser(data.user ?? null);
          }}
        />
      )}

      {loadingFeed && (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loadingFeed && tab === "leaderboard" && (
        <div className="flex flex-col gap-2">
          {leaderboard.length === 0 ? (
            <p className="text-sm text-center text-black/50 dark:text-white/50 py-8">
              No cleanups shared yet — be the first!
            </p>
          ) : (
            leaderboard.map((row, index) => (
              <div
                key={row.city}
                className="flex items-center gap-3 rounded-xl border border-black/10 dark:border-white/20 p-3"
              >
                <span className="font-bold text-lg w-6">{index + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {DEMO_REGIONS.find((r) => r.key === row.city)?.label ?? row.city}
                  </p>
                  <p className="text-xs text-black/50 dark:text-white/50">
                    {row.posts} cleanup{row.posts === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  {row.itemsRemoved}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {!loadingFeed && tab !== "leaderboard" && (
        <div className="flex flex-col gap-4">
          {posts.length === 0 ? (
            <p className="text-sm text-center text-black/50 dark:text-white/50 py-8">
              Nothing here yet. Complete a Cleanup Quest and share it to start this feed.
            </p>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                reacted={reactedIds.has(post.id)}
                canReact={Boolean(user)}
                onToggleReaction={handleToggleReaction}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
