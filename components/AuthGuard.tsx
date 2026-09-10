"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type Status = "checking" | "allowed";

/**
 * Gates the app routes behind a session. This is a UX gate, not the security
 * boundary — that is row level security on the database, which is what
 * actually stops one account reading or writing another's data.
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
      if (data.user) setStatus("allowed");
      else sendToLogin();
    });

    // Covers signing out in another tab and a session expiring mid-visit.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (!session && event !== "INITIAL_SESSION")) {
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
