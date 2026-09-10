"use client";

import { useEffect, useState } from "react";
import LocationPicker from "@/components/LocationPicker";
import { getLocation } from "@/lib/storage";

const STREAMS = [
  ["Recycle", "var(--recycle)", "Kerbside bin"],
  ["Compost", "var(--compost)", "Food & garden"],
  ["Landfill", "var(--landfill)", "General waste"],
  ["Drop-off", "var(--dropoff)", "Batteries, e-waste"],
] as const;

type State = "checking" | "needed" | "set";

/**
 * Location is asked for once for the whole app rather than by each feature.
 * Scanning and quests both need it, and asking twice made the two pages open
 * on what looked like the same screen.
 */
export default function LocationGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(getLocation() ? "set" : "needed");
  }, []);

  if (state === "checking") return null;

  if (state === "needed") {
    return (
      <div className="shell flex flex-col gap-7 fade-up">
        <div className="flex flex-col gap-3">
          <span className="eyebrow">First things first</span>
          <h1 className="display text-[2.1rem]">
            The same bottle belongs in different bins in different cities.
          </h1>
          <p className="text-[0.95rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            Tell EcoScan where you are and every answer — scans and cleanup
            scoring alike — follows your local collection rules.
          </p>
        </div>

        <LocationPicker action="Save and continue" onSaved={() => setState("set")} />

        <section className="flex flex-col gap-2.5">
          <div className="rule-label">
            <span className="eyebrow">Every scan ends in one of four</span>
          </div>
          <div className="streams">
            {STREAMS.map(([name, color, note]) => (
              <div key={name} className="stream-row">
                <span className="stream-swatch" style={{ background: color }} aria-hidden="true" />
                <span className="stream-name">{name}</span>
                <span className="stream-note">{note}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return <>{children}</>;
}
