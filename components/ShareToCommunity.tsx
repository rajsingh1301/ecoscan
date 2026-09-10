"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import JoinCommunity from "@/components/JoinCommunity";
import { createPost, ensureProfile } from "@/lib/community";
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
      <div className="w-full rounded-xl border p-3 text-[0.88rem] text-center" style={{ borderColor: "var(--moss)", background: "var(--moss-wash)" }}>
        ✅ Shared to the community
      </div>
    );
  }

  if (!user) {
    return (
      <JoinCommunity
        prompt={prompt}
        onJoined={async () => {
          const { data } = await createClient().auth.getUser();
          setUser(data.user ?? null);
        }}
      />
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
    <div className="w-full rounded-2xl border p-4 flex flex-col gap-3" style={{ borderColor: "var(--rule-strong)", background: "var(--surface)" }}>
      <p className="text-[0.92rem] font-semibold">{prompt}</p>

      <input
        type="text"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Add a caption (optional)"
        maxLength={140}
        className="field"
      />

      {message && <p className="text-[0.8rem]" style={{ color: "var(--dropoff)" }}>{message}</p>}

      <button
        type="button"
        onClick={handlePublish}
        disabled={status === "publishing"}
        className="btn btn-primary"
      >
        {status === "publishing" ? "Checking photos…" : "Share to community"}
      </button>

      {post.beforeImage && (
        <p className="text-[0.7rem] text-center" style={{ color: "var(--ink-faint)" }}>
          Photos are screened before publishing. Only your city is shown, never your exact location.
        </p>
      )}
    </div>
  );
}
