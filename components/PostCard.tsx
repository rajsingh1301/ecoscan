"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import Avatar from "@/components/Avatar";
import { BADGES } from "@/lib/gamification";
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

  async function handleReact() {
    if (!canReact || busy) return;
    setBusy(true);
    await onToggleReaction(post, reacted);
    setBusy(false);
  }

  return (
    <article className="w-full rounded-2xl border overflow-hidden" style={{ borderColor: "var(--rule)", background: "var(--surface)" }}>
      <header className="flex items-center gap-3 px-4 py-3">
        <Avatar seed={post.username} emoji={post.avatar_emoji} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-[0.88rem] font-semibold truncate">{post.username}</p>
          <p className="text-[0.75rem]" style={{ color: "var(--ink-faint)" }}>
            {cityLabel(post.city)} · {timeAgo(post.created_at)}
          </p>
        </div>
      </header>

      {post.type === "cleanup" && post.before_url && post.after_url && (
        <div className="grid grid-cols-2 gap-px" style={{ background: "var(--rule)" }}>
          <figure className="relative bg-black">
            <img src={post.before_url} alt="Before cleanup" className="w-full aspect-square object-cover" />
            <figcaption className="absolute top-2 left-2 rounded-full text-[0.68rem] px-2 py-0.5" style={{ background: "rgb(13 21 18 / 0.72)", color: "#eef3ec" }}>
              Before
            </figcaption>
          </figure>
          <figure className="relative bg-black">
            <img src={post.after_url} alt="After cleanup" className="w-full aspect-square object-cover" />
            <figcaption className="absolute top-2 left-2 rounded-full text-[0.68rem] px-2 py-0.5" style={{ background: "var(--hivis)", color: "var(--on-hivis)" }}>
              After
            </figcaption>
          </figure>
        </div>
      )}

      <div className="px-4 py-3 flex flex-col gap-2">
        {post.type === "cleanup" && (
          <p className="text-[0.88rem] font-medium">
            AI verified · {post.items_removed} items removed
            {post.xp_earned ? ` · +${post.xp_earned} XP` : ""}
          </p>
        )}

        {post.type === "badge" && (
          <p className="text-[0.88rem] font-medium">
            {badge ? `${badge.emoji} Unlocked "${badge.name}" — ${badge.description}` : "Unlocked a new badge"}
          </p>
        )}

        {post.type === "streak" && (
          <p className="text-[0.88rem] font-medium">🔥 {post.streak_days}-day scanning streak</p>
        )}

        {post.caption && <p className="text-[0.88rem]">{post.caption}</p>}

        <button
          type="button"
          onClick={handleReact}
          disabled={!canReact || busy}
          className="chip self-start"
          style={
            reacted
              ? { borderColor: "var(--moss)", color: "var(--moss)", background: "var(--moss-wash)" }
              : undefined
          }
        >
          👏 {post.reaction_count}
        </button>
      </div>
    </article>
  );
}
