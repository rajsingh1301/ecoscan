"use client";

import { useState } from "react";
import { DEMO_REGIONS } from "@/lib/rulesEngine";
import { setLocation } from "@/lib/storage";
import type { UserLocation } from "@/lib/types";

interface LocationPickerProps {
  currentRegionKey?: string;
  onSaved: (location: UserLocation) => void;
}

export default function LocationPicker({ currentRegionKey, onSaved }: LocationPickerProps) {
  const [regionKey, setRegionKey] = useState(currentRegionKey ?? DEMO_REGIONS[0].key);

  function handleSave() {
    const region = DEMO_REGIONS.find((r) => r.key === regionKey) ?? DEMO_REGIONS[0];
    const location: UserLocation = { regionKey: region.key, label: region.label };
    setLocation(location);
    onSaved(location);
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm">
      <div>
        <label htmlFor="region" className="block text-sm font-medium mb-2">
          Your location
        </label>
        <select
          id="region"
          value={regionKey}
          onChange={(e) => setRegionKey(e.target.value)}
          className="w-full rounded-lg border border-black/10 dark:border-white/20 bg-transparent px-3 py-2"
        >
          {DEMO_REGIONS.map((region) => (
            <option key={region.key} value={region.key}>
              {region.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-black/50 dark:text-white/50 mt-2">
          Disposal rules vary by city — pick the closest match, or &quot;Other&quot; for generic guidance.
        </p>
      </div>

      <button
        type="button"
        onClick={handleSave}
        className="rounded-full bg-emerald-600 text-white font-medium py-3 active:scale-95 transition"
      >
        Save location
      </button>
    </div>
  );
}
