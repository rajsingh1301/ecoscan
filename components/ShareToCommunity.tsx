"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { createPost, ensureProfile, signInWithGoogle } from "@/lib/community";
import { getLocation } from "@/lib/storage";
import type { NewPost } from "@/lib/types";

type Status = "idle" | "publishing" | "done" | "error";

interface ShareToCommunityProps {
  post: NewPost;
  prompt?: string;
}

export default function ShareToCommunity({ post, prompt = "Share this to the community?" }: ShareToCommunityProps) {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChecked(true);
      return;
    }

    createClient()
      .auth.getUser()
      .then(({ data }) => {
        setUser(data.user ?? null);
        setChecked(true);
      });
  }, [configured]);

  if (!configured || !checked) return null;

  if (status === "done") {
    return (
      <div className="w-full rounded-xl border border-emerald-500 bg-emerald-50 dark:bg-emerald-950 p-3 text-sm text-center">
        ✅ Shared to the community
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full rounded-xl border border-black/10 dark:border-white/20 p-4 flex flex-col gap-2 text-center">
        <p className="text-sm font-medium">{prompt}</p>
        <button
          type="button"
          onClick={() => signInWithGoogle(window.location.pathname)}
          className="rounded-full bg-emerald-600 text-white text-sm font-medium py-2.5"
        >
          Sign in with Google to share
        </button>
      </div>
    );
  }

  async function handlePublish() {
    if (!user) return;
    setStatus("publishing");
    setMessage(null);

    const city = getLocation()?.regionKey ?? "default";
    await ensureProfile(user, city);

    const result = await createPost(user, city, {
      ...post,
      caption: caption.trim() || undefined,
    });

    if (result.ok) {
      setStatus("done");
    } else {
      setStatus("error");
      setMessage(result.error ?? "Could not share this post.");
    }
  }

  return (
    <div className="w-full rounded-xl border border-black/10 dark:border-white/20 p-4 flex flex-col gap-3">
      <p className="text-sm font-medium">{prompt}</p>

      <input
        type="text"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Add a caption (optional)"
        maxLength={140}
        className="w-full rounded-lg border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
      />

      {message && <p className="text-xs text-orange-600 dark:text-orange-400">{message}</p>}

      <button
        type="button"
        onClick={handlePublish}
        disabled={status === "publishing"}
        className="rounded-full bg-emerald-600 text-white text-sm font-medium py-2.5 disabled:opacity-50"
      >
        {status === "publishing" ? "Checking photos…" : "Share to community"}
      </button>

      {post.beforeImage && (
        <p className="text-[11px] text-black/40 dark:text-white/40 text-center">
          Photos are screened before publishing. Only your city is shown, never your exact location.
        </p>
      )}
    </div>
  );
}
