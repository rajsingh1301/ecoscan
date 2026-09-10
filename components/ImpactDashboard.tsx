"use client";

import { useEffect, useState } from "react";
import { clearHistory, getCleanups, getHistory } from "@/lib/storage";
import { clearRemoteProgress } from "@/lib/sync";
import { VERDICT_STYLES } from "@/lib/verdictStyles";
import { VERDICTS } from "@/lib/types";
import type { CleanupRecord, ScanRecord, Verdict } from "@/lib/types";

const STREAM_VAR: Record<Verdict, string> = {
  recycle: "var(--recycle)",
  compost: "var(--compost)",
  trash: "var(--landfill)",
  special_dropoff: "var(--dropoff)",
};

export default function ImpactDashboard() {
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [cleanups, setCleanups] = useState<CleanupRecord[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(getHistory());
    setCleanups(getCleanups());
  }, []);

  const counts: Record<Verdict, number> = {
    recycle: 0,
    compost: 0,
    trash: 0,
    special_dropoff: 0,
  };
  history.forEach((record) => {
    counts[record.verdict] += 1;
  });

  async function handleClear() {
    setConfirming(false);
    setFailed(false);
    clearHistory();
    setHistory([]);
    setCleanups([]);

    // If the account rows survive, the next sync pulls everything back and the
    // delete looks like it silently did nothing. Say so instead.
    const ok = await clearRemoteProgress().then(
      () => true,
      () => false
    );
    if (!ok) setFailed(true);
  }

  if (history.length === 0 && cleanups.length === 0) {
    return (
      <section className="flex flex-col gap-2.5">
        <div className="rule-label">
          <span className="eyebrow">Activity</span>
        </div>
        <p className="text-[0.88rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          Nothing scanned yet. Your first scan starts the record.
        </p>
      </section>
    );
  }

  return (
    <>
      {history.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <div className="rule-label">
            <span className="eyebrow">Where it went</span>
          </div>

          <div className="flex flex-col gap-2">
            {VERDICTS.map((verdict) => {
              const count = counts[verdict];
              const pct = history.length ? Math.round((count / history.length) * 100) : 0;
              return (
                <div key={verdict} className="flex items-center gap-3">
                  <span className="text-[0.82rem] w-24 shrink-0">
                    {VERDICT_STYLES[verdict].label}
                  </span>
                  <div className="meter flex-1">
                    <i style={{ width: `${pct}%`, background: STREAM_VAR[verdict] }} />
                  </div>
                  <span
                    className="tabular text-[0.78rem] w-6 text-right"
                    style={{ color: "var(--ink-faint)" }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <div className="rule-label">
            <span className="eyebrow">Recent scans</span>
          </div>

          <div className="flex flex-col">
            {history.slice(0, 12).map((record) => (
              <div key={record.id} className="item-line">
                <span className="truncate">{record.itemName}</span>
                <span style={{ color: STREAM_VAR[record.verdict] }}>
                  {VERDICT_STYLES[record.verdict].label}
                </span>
              </div>
            ))}
          </div>

          {failed && (
            <p className="text-[0.8rem]" style={{ color: "var(--dropoff)" }}>
              Cleared on this device, but your account still holds it — check
              your connection and try again.
            </p>
          )}

          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="text-[0.8rem] underline underline-offset-2 self-start"
              style={{ color: "var(--ink-faint)" }}
            >
              Clear all activity
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-[0.8rem]" style={{ color: "var(--ink-soft)" }}>
                Delete every scan and cleanup?
              </p>
              <button
                type="button"
                onClick={handleClear}
                className="text-[0.8rem] font-semibold underline underline-offset-2"
                style={{ color: "var(--dropoff)" }}
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-[0.8rem] underline underline-offset-2"
                style={{ color: "var(--ink-faint)" }}
              >
                Keep
              </button>
            </div>
          )}
        </section>
      )}
    </>
  );
}
