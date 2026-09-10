"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { isGuest } from "@/lib/storage";

type Status = "checking" | "allowed";

/**
 * Lets someone through on either a real session or an explicit guest choice,
 * so the app can be tried before an account exists.
 *
 * This is a UX gate, not the security boundary — that is row level security on
 * the database, which is what actually stops one account reading or writing
 * another's data. A guest has no session at all, so there is nothing for them
 * to reach: their data never leaves this browser.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    // Without a backend configured there is no session to check, and locking
    // everyone out of their own app would be worse than letting them in.
    if (!isSupabaseConfigured()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("allowed");
      return;
    }

    const supabase = createClient();

    function sendToLogin() {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }

    void supabase.auth.getUser().then(({ data }) => {
      if (data.user || isGuest()) setStatus("allowed");
      else sendToLogin();
    });

    // Covers signing out in another tab and a session expiring mid-visit.
    // Leaving guest mode clears the flag first, so this catches that too.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && !isGuest()) {
        setStatus("checking");
        sendToLogin();
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [router, pathname]);

  if (status === "checking") {
    return (
      <div className="shell flex justify-center pt-24">
        <div className="spinner" />
      </div>
    );
  }

  return <>{children}</>;
}
