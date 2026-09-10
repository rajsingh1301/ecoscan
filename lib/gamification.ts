import type { CleanupRecord, ScanRecord, Verdict } from "@/lib/types";

export const XP_TABLE: Record<Verdict, number> = {
  recycle: 10,
  compost: 10,
  special_dropoff: 15,
  trash: 3,
};

export const CLEANUP_XP_PER_ITEM = 20;
export const CLEANUP_FULL_BONUS = 50;

function computeScanXp(history: ScanRecord[]): number {
  return history.reduce((total, record) => total + XP_TABLE[record.verdict], 0);
}

function computeCleanupXp(cleanups: CleanupRecord[]): number {
  return cleanups.reduce((total, record) => total + record.xpEarned, 0);
}

/** The single XP figure everything else reads: ranks, the header chip, sync. */
export function computeTotalXp(history: ScanRecord[], cleanups: CleanupRecord[]): number {
  return computeScanXp(history) + computeCleanupXp(cleanups);
}

export interface BadgeContext {
  history: ScanRecord[];
  streak: number;
  cleanups: CleanupRecord[];
}

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  isUnlocked: (ctx: BadgeContext) => boolean;
}

function countVerdict(history: ScanRecord[], verdict: Verdict): number {
  return history.filter((record) => record.verdict === verdict).length;
}

export const BADGES: Badge[] = [
  {
    id: "first_scan",
    name: "First Steps",
    emoji: "🌱",
    description: "Scan your first item",
    isUnlocked: ({ history }) => history.length >= 1,
  },
  {
    id: "five_scans",
    name: "Getting Started",
    emoji: "📦",
    description: "Scan 5 items",
    isUnlocked: ({ history }) => history.length >= 5,
  },
  {
    id: "fifty_scans",
    name: "Sorting Pro",
    emoji: "🏆",
    description: "Scan 50 items",
    isUnlocked: ({ history }) => history.length >= 50,
  },
  {
    id: "streak_3",
    name: "3-Day Streak",
    emoji: "🔥",
    description: "Scan on 3 days in a row",
    isUnlocked: ({ streak }) => streak >= 3,
  },
  {
    id: "streak_7",
    name: "Week Warrior",
    emoji: "🔥🔥",
    description: "Scan on 7 days in a row",
    isUnlocked: ({ streak }) => streak >= 7,
  },
  {
    id: "recycle_20",
    name: "Recycling Champion",
    emoji: "♻️",
    description: "Recycle 20 items",
    isUnlocked: ({ history }) => countVerdict(history, "recycle") >= 20,
  },
  {
    id: "compost_10",
    name: "Compost Master",
    emoji: "🌿",
    description: "Compost 10 items",
    isUnlocked: ({ history }) => countVerdict(history, "compost") >= 10,
  },
  {
    id: "special_5",
    name: "Hazard Handler",
    emoji: "⚠️",
    description: "Correctly route 5 special drop-off items",
    isUnlocked: ({ history }) => countVerdict(history, "special_dropoff") >= 5,
  },
  {
    id: "all_categories",
    name: "Category Master",
    emoji: "🎯",
    description: "Get at least one of every verdict type",
    isUnlocked: ({ history }) => {
      const verdicts = new Set(history.map((record) => record.verdict));
      return (
        verdicts.has("recycle") &&
        verdicts.has("compost") &&
        verdicts.has("trash") &&
        verdicts.has("special_dropoff")
      );
    },
  },
  {
    id: "first_cleanup",
    name: "Street Warrior",
    emoji: "🧹",
    description: "Complete your first verified cleanup quest",
    isUnlocked: ({ cleanups }) => cleanups.length >= 1,
  },
  {
    id: "spotless",
    name: "Spotless",
    emoji: "✨",
    description: "Clear every item in a single cleanup quest",
    isUnlocked: ({ cleanups }) =>
      cleanups.some((c) => c.totalItemsBefore > 0 && c.itemsRemoved === c.totalItemsBefore),
  },
  {
    id: "litter_slayer",
    name: "Litter Slayer",
    emoji: "💪",
    description: "Remove 50 pieces of litter in total",
    isUnlocked: ({ cleanups }) => cleanups.reduce((sum, c) => sum + c.itemsRemoved, 0) >= 50,
  },
];

export function getUnlockedBadgeIds(ctx: BadgeContext): Set<string> {
  return new Set(BADGES.filter((badge) => badge.isUnlocked(ctx)).map((badge) => badge.id));
}

export interface DailyChallenge {
  id: string;
  description: string;
  target: number;
  progress: (todayHistory: ScanRecord[]) => number;
}

const DAILY_CHALLENGES: DailyChallenge[] = [
  { id: "scan_3", description: "Scan 3 items today", target: 3, progress: (h) => h.length },
  { id: "recycle_2", description: "Recycle 2 items today", target: 2, progress: (h) => countVerdict(h, "recycle") },
  { id: "compost_1", description: "Compost at least 1 item today", target: 1, progress: (h) => countVerdict(h, "compost") },
  { id: "scan_5", description: "Scan 5 items today", target: 5, progress: (h) => h.length },
];

export function getTodayChallenge(): DailyChallenge {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  return DAILY_CHALLENGES[dayOfYear % DAILY_CHALLENGES.length];
}

export function getTodayHistory(history: ScanRecord[]): ScanRecord[] {
  const today = new Date().toDateString();
  return history.filter((record) => new Date(record.timestamp).toDateString() === today);
}
