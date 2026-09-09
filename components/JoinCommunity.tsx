"use client";

import { useState } from "react";
import { AVATAR_CHOICES, joinCommunity } from "@/lib/community";
import { getLocation } from "@/lib/storage";

interface JoinCommunityProps {
  prompt?: string;
  onJoined: () => void;
}

export default function JoinCommunity({
  prompt = "Pick a name to join the community",
  onJoined,
}: JoinCommunityProps) {
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState(AVATAR_CHOICES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    const trimmed = username.trim();
    if (!trimmed) {
      setError("Please enter a display name.");
      return;
    }

    setBusy(true);
    setError(null);

    const result = await joinCommunity(trimmed, avatar, getLocation()?.regionKey ?? "default");

    if (result.ok) {
      onJoined();
    } else {
      setError(result.error ?? "Could not join right now.");
      setBusy(false);
    }
  }

  return (
    <div className="w-full rounded-xl border border-black/10 dark:border-white/20 p-4 flex flex-col gap-3">
      <p className="text-sm font-medium">{prompt}</p>

      <div className="flex gap-2">
        <div className="flex gap-1 flex-wrap">
          {AVATAR_CHOICES.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setAvatar(emoji)}
              className={`w-9 h-9 rounded-full text-lg transition ${
                avatar === emoji
                  ? "bg-emerald-100 dark:bg-emerald-900 ring-2 ring-emerald-500"
                  : "bg-black/5 dark:bg-white/10"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Display name"
        maxLength={40}
        className="w-full rounded-lg border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
      />

      {error && <p className="text-xs text-orange-600 dark:text-orange-400">{error}</p>}

      <button
        type="button"
        onClick={handleJoin}
        disabled={busy}
        className="rounded-full bg-emerald-600 text-white text-sm font-medium py-2.5 disabled:opacity-50"
      >
        {busy ? "Joining…" : "Join community"}
      </button>

      <p className="text-[11px] text-black/40 dark:text-white/40 text-center">
        No email or password needed — your name is stored on this device.
      </p>
    </div>
  );
}
