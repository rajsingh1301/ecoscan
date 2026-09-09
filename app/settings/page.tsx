"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LocationPicker from "@/components/LocationPicker";
import { getLocation } from "@/lib/storage";

export default function SettingsPage() {
  const router = useRouter();
  const [currentRegionKey, setCurrentRegionKey] = useState<string | undefined>(undefined);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // localStorage is client-only; read post-mount to avoid SSR mismatch.
    const location = getLocation();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (location) setCurrentRegionKey(location.regionKey);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <h1 className="text-xl font-bold">Settings</h1>
      <LocationPicker
        currentRegionKey={currentRegionKey}
        onSaved={() => {
          setSaved(true);
          setTimeout(() => router.push("/"), 800);
        }}
      />
      {saved && <p className="text-sm text-emerald-600">Saved! Redirecting…</p>}
    </div>
  );
}
