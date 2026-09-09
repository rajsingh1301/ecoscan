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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="region" className="eyebrow">
          Where are you?
        </label>
        <select
          id="region"
          value={regionKey}
          onChange={(e) => setRegionKey(e.target.value)}
          className="field"
        >
          {DEMO_REGIONS.map((region) => (
            <option key={region.key} value={region.key}>
              {region.label}
            </option>
          ))}
        </select>
        <p className="text-[0.78rem] leading-relaxed" style={{ color: "var(--ink-faint)" }}>
          Not on the list? Pick the generic rules — they cover the safe answer everywhere.
        </p>
      </div>

      <button type="button" onClick={handleSave} className="btn btn-primary">
        Start scanning
      </button>
    </div>
  );
}
