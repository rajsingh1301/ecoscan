"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getProfile, type Profile } from "@/lib/community";
import { isGuest } from "@/lib/storage";

type State = "checking" | "signed-out" | "guest" | "signed-in";

export default function NavUser() {
  const [state, setState] = useState<State>("checking");
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState("signed-out");
      return;
    }

    const supabase = createClient();

    async function read() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setProfile(null);
        setState(isGuest() ? "guest" : "signed-out");
        return;
      }
      setProfile(await getProfile(data.user.id));
      setState("signed-in");
    }

    void read();

    const { data: listener } = supabase.auth.onAuthStateChange(() => void read());
    return () => listener.subscription.unsubscribe();
  }, []);

  if (state === "checking") return null;

  if (state === "signed-out") {
    return (
      <Link href="/login" className="navlink">
        Sign in
      </Link>
    );
  }

  if (state === "guest") {
    return (
      <Link href="/profile" title="Guest — your data is on this device only">
        <Avatar seed="guest" emoji="🌱" size="sm" />
      </Link>
    );
  }

  return (
    <Link href="/profile" title={profile?.username ?? "Your profile"}>
      <Avatar
        seed={profile?.username ?? "you"}
        emoji={profile?.avatar_emoji ?? "🌱"}
        size="sm"
      />
    </Link>
  );
}
