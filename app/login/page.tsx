"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import JoinCommunity from "@/components/JoinCommunity";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { syncProgress } from "@/lib/sync";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [checking, setChecking] = useState(true);

  const next = params.get("next") ?? "/scan";
  // Only ever bounce back into this app, never to a URL a link could supply.
  const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/scan";

  const finish = useCallback(async () => {
    await syncProgress().catch(() => {});
    router.replace(destination);
  }, [router, destination]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChecking(false);
      return;
    }

    void createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) router.replace(destination);
        else setChecking(false);
      });
  }, [router, destination]);

  if (checking) {
    return (
      <div className="flex justify-center pt-16">
        <div className="spinner" />
      </div>
    );
  }

  if (!isSupabaseConfigured()) {
    return (
      <p className="text-[0.9rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
        Accounts aren&apos;t configured for this deployment, so there is nothing to
        sign in to. <Link href="/scan" className="underline underline-offset-2">Open the scanner</Link>.
      </p>
    );
  }

  return <JoinCommunity prompt="Enter your email to sign in" onJoined={finish} />;
}

export default function LoginPage() {
  return (
    <div className="shell flex flex-col gap-7 fade-up">
      <div className="flex flex-col gap-3">
        <span className="eyebrow">Sign in</span>
        <h1 className="display text-[2.1rem]">Your progress needs somewhere to live.</h1>
        <p className="text-[0.95rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          No password — we email you a short code. The same account carries your
          rank, streak and verified cleanups to any device you sign in on.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center pt-8">
            <div className="spinner" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>

      <Link
        href="/"
        className="text-[0.83rem] underline underline-offset-2 self-start"
        style={{ color: "var(--ink-faint)" }}
      >
        Back to the homepage
      </Link>
    </div>
  );
}
