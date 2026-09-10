"use client";

import { useEffect } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { syncProgress } from "@/lib/sync";

/**
 * Mounted once in the layout: pulls the account's progress onto this device on
 * load and again whenever the session changes, so signing in on a new phone
 * restores history rather than starting from zero.
 */
export default function ProgressSync() {
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    void syncProgress().catch(() => {});

    const { data } = createClient().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        void syncProgress().catch(() => {});
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return null;
}
