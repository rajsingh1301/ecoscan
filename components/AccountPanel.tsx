"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import JoinCommunity from "@/components/JoinCommunity";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getProfile, signOut, type Profile } from "@/lib/community";
import { syncProgress } from "@/lib/sync";

type State = "checking" | "signed-out" | "joining" | "signed-in";

export default function AccountPanel() {
  const [state, setState] = useState<State>("checking");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  const load = useCallback(async () => {
    const { data } = await createClient().auth.getUser();
    const current = data.user ?? null;
    setUser(current);
    if (current) {
      setProfile(await getProfile(current.id));
      setState("signed-in");
    } else {
      setState("signed-out");
    }
  }, []);

  useEffect(() => {
    if (!configured) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState("signed-out");
      return;
    }
    void load();
  }, [configured, load]);

  if (!configured || state === "checking") return null;

  async function handleSync() {
    setSyncing(true);
    const result = await syncProgress().catch(() => null);
    setSyncing(false);
    if (result?.synced) {
      setSyncedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }
  }

  if (state === "signed-in" && user) {
    return (
      <section className="flex flex-col gap-2.5">
        <div className="rule-label">
          <span className="eyebrow">Account</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xl">{profile?.avatar_emoji ?? "🌱"}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.92rem] font-semibold truncate">
              {profile?.username ?? "Your account"}
            </p>
            <p className="text-[0.78rem] truncate" style={{ color: "var(--ink-faint)" }}>
              {user.email}
            </p>
          </div>
        </div>

        <p className="text-[0.8rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          {syncedAt
            ? `Progress saved to your account at ${syncedAt}. Sign in anywhere to pick it up.`
            : "Your progress is saved to this account and follows you to any device."}
        </p>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="text-[0.82rem] font-semibold underline underline-offset-2 disabled:opacity-50"
            style={{ color: "var(--moss)" }}
          >
            {syncing ? "Syncing…" : "Sync now"}
          </button>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              setUser(null);
              setProfile(null);
              setState("signed-out");
            }}
            className="text-[0.82rem] underline underline-offset-2"
            style={{ color: "var(--ink-faint)" }}
          >
            Sign out
          </button>
        </div>
      </section>
    );
  }

  if (state === "joining") {
    return (
      <section className="flex flex-col gap-2.5">
        <div className="rule-label">
          <span className="eyebrow">Account</span>
        </div>
        <JoinCommunity
          prompt="Save your progress to an account"
          onJoined={async () => {
            await load();
            await syncProgress().catch(() => {});
          }}
        />
        <button
          type="button"
          onClick={() => setState("signed-out")}
          className="text-[0.82rem] underline underline-offset-2 self-start"
          style={{ color: "var(--ink-faint)" }}
        >
          Not now
        </button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-2.5">
      <div className="rule-label">
        <span className="eyebrow">Account</span>
      </div>
      <p className="text-[0.85rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
        Everything above is saved on this device only. Add an account and it
        survives a cleared browser or a new phone.
      </p>
      <button
        type="button"
        onClick={() => setState("joining")}
        className="btn btn-quiet self-start"
      >
        Save my progress
      </button>
    </section>
  );
}
