"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { BADGES, LEVELS } from "@/lib/gamification";
import { DEMO_REGIONS } from "@/lib/rulesEngine";
import type { FeedPost } from "@/lib/types";

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function cityLabel(key: string): string {
  return DEMO_REGIONS.find((region) => region.key === key)?.label ?? "Somewhere";
}

interface PostCardProps {
  post: FeedPost;
  reacted: boolean;
  canReact: boolean;
  onToggleReaction: (post: FeedPost, reacted: boolean) => void;
}

export default function PostCard({ post, reacted, canReact, onToggleReaction }: PostCardProps) {
  const [busy, setBusy] = useState(false);

  const badge = post.badge_id ? BADGES.find((b) => b.id === post.badge_id) : undefined;
  const level = post.level_reached ? LEVELS.find((l) => l.level === post.level_reached) : undefined;

  async function handleReact() {
    if (!canReact || busy) return;
    setBusy(true);
    await onToggleReaction(post, reacted);
    setBusy(false);
  }

  return (
    <article className="w-full rounded-2xl border border-black/10 dark:border-white/15 overflow-hidden">
      <header className="flex items-center gap-3 px-4 py-3">
        <span className="text-2xl">{post.avatar_emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{post.username}</p>
          <p className="text-xs text-black/50 dark:text-white/50">
            {cityLabel(post.city)} · {timeAgo(post.created_at)}
          </p>
        </div>
      </header>

      {post.type === "cleanup" && post.before_url && post.after_url && (
        <div className="grid grid-cols-2 gap-px bg-black/10 dark:bg-white/10">
          <figure className="relative bg-black">
            <img src={post.before_url} alt="Before cleanup" className="w-full aspect-square object-cover" />
            <figcaption className="absolute top-2 left-2 rounded-full bg-black/70 text-white text-[11px] px-2 py-0.5">
              Before
            </figcaption>
          </figure>
          <figure className="relative bg-black">
            <img src={post.after_url} alt="After cleanup" className="w-full aspect-square object-cover" />
            <figcaption className="absolute top-2 left-2 rounded-full bg-emerald-600 text-white text-[11px] px-2 py-0.5">
              After
            </figcaption>
          </figure>
        </div>
      )}

      <div className="px-4 py-3 flex flex-col gap-2">
        {post.type === "cleanup" && (
          <p className="text-sm font-medium">
            ✅ AI Verified · {post.items_removed} items removed
            {post.xp_earned ? ` · +${post.xp_earned} XP` : ""}
          </p>
        )}

        {post.type === "badge" && (
          <p className="text-sm font-medium">
            {badge ? `${badge.emoji} Unlocked "${badge.name}" — ${badge.description}` : "🏅 Unlocked a new badge"}
          </p>
        )}

        {post.type === "level" && (
          <p className="text-sm font-medium">
            {level ? `${level.emoji} Reached Level ${level.level} — ${level.title}` : "Levelled up"}
          </p>
        )}

        {post.type === "streak" && (
          <p className="text-sm font-medium">🔥 {post.streak_days}-day scanning streak</p>
        )}

        {post.caption && <p className="text-sm">{post.caption}</p>}

        <button
          type="button"
          onClick={handleReact}
          disabled={!canReact || busy}
          className={`self-start rounded-full border px-3 py-1 text-sm transition disabled:opacity-50 ${
            reacted
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
              : "border-black/10 dark:border-white/20"
          }`}
        >
          👏 {post.reaction_count}
        </button>
      </div>
    </article>
  );
}
