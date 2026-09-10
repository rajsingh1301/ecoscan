"use client";

import { useCallback, useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import RankCard from "@/components/RankCard";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchPlayerBoard, type BoardScope, type RankedPlayer } from "@/lib/community";
import { getCleanups, getHistory, getLocation } from "@/lib/storage";
import { computeTotalXp } from "@/lib/gamification";
import { countryOf, getRank } from "@/lib/ranks";
import { DEMO_REGIONS } from "@/lib/rulesEngine";

export default function RanksPage() {
  const configured = isSupabaseConfigured();

  const [scope, setScope] = useState<BoardScope>("global");
  const [players, setPlayers] = useState<RankedPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [regionKey, setRegionKey] = useState("default");
  const [myId, setMyId] = useState<string | null>(null);
  const [myXp, setMyXp] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRegionKey(getLocation()?.regionKey ?? "default");
    setMyXp(computeTotalXp(getHistory(), getCleanups()));

    if (configured) {
      void createClient()
        .auth.getUser()
        .then(({ data }) => setMyId(data.user?.id ?? null));
    }
  }, [configured]);

  const load = useCallback(async () => {
    if (!configured) return;
    setLoading(true);
    setPlayers(await fetchPlayerBoard(scope, regionKey));
    setLoading(false);
  }, [configured, scope, regionKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const country = countryOf(regionKey);
  // The generic region's label is a full sentence, so it can't be used as a tab.
  const cityLabel =
    regionKey === "default"
      ? "My area"
      : (DEMO_REGIONS.find((r) => r.key === regionKey)?.label.split(",")[0] ?? "My area");

  return (
    <div className="shell flex flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <span className="eyebrow">Ranks</span>
        <h1 className="display text-[2rem]">Where you stand.</h1>
      </div>

      <RankCard xp={myXp} />

      {!configured ? (
        <p className="text-[0.88rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          Leaderboards need an account backend, which isn&apos;t configured here.
        </p>
      ) : (
        <section className="flex flex-col gap-3.5">
          <div className="tabs" role="tablist">
            {(
              [
                ["global", "Global"],
                ["country", country?.name ?? "Country"],
                ["city", cityLabel],
              ] as [BoardScope, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={scope === key}
                onClick={() => setScope(key)}
                className="tab"
                disabled={key === "country" && !country}
              >
                {label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex justify-center py-8">
              <div className="spinner" />
            </div>
          )}

          {!loading && players.length === 0 && (
            <p className="text-[0.88rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
              No ranked players here yet. Save your progress to an account and
              you&apos;ll be the first on this board.
            </p>
          )}

          {!loading && players.length > 0 && (
            <div className="flex flex-col">
              {players.map((player, index) => {
                const rank = getRank(player.total_xp);
                return (
                  <div
                    key={player.id}
                    className={`board-row${player.id === myId ? " is-you" : ""}`}
                  >
                    <span className="board-place">{index + 1}</span>
                    <Avatar seed={player.username} emoji={player.avatar_emoji} size="sm" />
                    <div className="min-w-0 flex flex-col gap-0.5">
                      <span className="board-name">{player.username}</span>
                      <span
                        className="tier-chip"
                        style={{ ["--tier" as string]: rank.tier.color }}
                      >
                        {rank.label}
                      </span>
                    </div>
                    <span className="board-xp tabular">{player.total_xp}</span>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[0.75rem] leading-relaxed" style={{ color: "var(--ink-faint)" }}>
            Ranked by total XP. Only players with an account appear here.
          </p>
        </section>
      )}
    </div>
  );
}
