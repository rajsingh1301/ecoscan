"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  AVATAR_CHOICES,
  createProfile,
  getProfile,
  sendEmailOtp,
  verifyEmailOtp,
} from "@/lib/community";
import { getLocation } from "@/lib/storage";

type Step = "email" | "otp" | "profile";

// Supabase's OTP length is a project setting (6 by default, 8 here), so accept
// a range rather than pinning the input to one length.
const MIN_CODE_LENGTH = 6;
const MAX_CODE_LENGTH = 10;

interface JoinCommunityProps {
  prompt?: string;
  onJoined: () => void;
}

export default function JoinCommunity({
  prompt = "Join the community",
  onJoined,
}: JoinCommunityProps) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState(AVATAR_CHOICES[0]);
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSendCode() {
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setBusy(true);
    setError(null);

    const result = await sendEmailOtp(trimmed);
    setBusy(false);

    if (result.ok) {
      setNotice(`We sent a code to ${trimmed}`);
      setStep("otp");
    } else {
      setError(result.error ?? "Could not send the code.");
    }
  }

  async function handleVerify() {
    if (code.trim().length < MIN_CODE_LENGTH) {
      setError("Enter the code from your email.");
      return;
    }

    setBusy(true);
    setError(null);

    const result = await verifyEmailOtp(email, code);

    if (!result.ok || !result.user) {
      setBusy(false);
      setError(result.error ?? "That code didn't work.");
      return;
    }

    const existing = await getProfile(result.user.id);
    setBusy(false);

    if (existing) {
      onJoined();
      return;
    }

    setUser(result.user);
    setNotice(null);
    setStep("profile");
  }

  async function handleCreateProfile() {
    if (!user) return;
    const trimmed = username.trim();
    if (!trimmed) {
      setError("Please enter a display name.");
      return;
    }

    setBusy(true);
    setError(null);

    const result = await createProfile(user, trimmed, avatar, getLocation()?.regionKey ?? "default");
    setBusy(false);

    if (result.ok) onJoined();
    else setError(result.error ?? "Could not create your profile.");
  }

  return (
    <div className="w-full rounded-xl border border-black/10 dark:border-white/20 p-4 flex flex-col gap-3">
      <p className="text-sm font-medium">{prompt}</p>

      {notice && <p className="text-xs text-black/60 dark:text-white/60">{notice}</p>}

      {step === "email" && (
        <>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleSendCode}
            disabled={busy}
            className="rounded-full bg-emerald-600 text-white text-sm font-medium py-2.5 disabled:opacity-50"
          >
            {busy ? "Sending code…" : "Send me a code"}
          </button>
          <p className="text-[11px] text-black/40 dark:text-white/40 text-center">
            No password. We email you a code to sign in.
          </p>
        </>
      )}

      {step === "otp" && (
        <>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, MAX_CODE_LENGTH))}
            placeholder="Enter code"
            className="w-full rounded-lg border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-center text-lg tracking-[0.3em] font-mono"
          />
          <button
            type="button"
            onClick={handleVerify}
            disabled={busy}
            className="rounded-full bg-emerald-600 text-white text-sm font-medium py-2.5 disabled:opacity-50"
          >
            {busy ? "Verifying…" : "Verify code"}
          </button>
          <div className="flex justify-between text-[11px]">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
                setNotice(null);
              }}
              className="text-black/40 dark:text-white/40 underline"
            >
              Use a different email
            </button>
            <button
              type="button"
              onClick={handleSendCode}
              disabled={busy}
              className="text-black/40 dark:text-white/40 underline disabled:opacity-50"
            >
              Resend code
            </button>
          </div>
        </>
      )}

      {step === "profile" && (
        <>
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
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Display name"
            maxLength={40}
            className="w-full rounded-lg border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleCreateProfile}
            disabled={busy}
            className="rounded-full bg-emerald-600 text-white text-sm font-medium py-2.5 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Finish"}
          </button>
        </>
      )}

      {error && <p className="text-xs text-orange-600 dark:text-orange-400">{error}</p>}
    </div>
  );
}
