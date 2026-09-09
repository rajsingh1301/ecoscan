import type { ScanRecord, Verdict } from "@/lib/types";

export const XP_TABLE: Record<Verdict, number> = {
  recycle: 10,
  compost: 10,
  special_dropoff: 15,
  trash: 3,
};

export interface Level {
  level: number;
  title: string;
  emoji: string;
  minXp: number;
}

export const LEVELS: Level[] = [
  { level: 1, title: "Seedling", emoji: "🌱", minXp: 0 },
  { level: 2, title: "Sprout", emoji: "🌿", minXp: 50 },
  { level: 3, title: "Sapling", emoji: "🌳", minXp: 150 },
  { level: 4, title: "Young Tree", emoji: "🌲", minXp: 350 },
  { level: 5, title: "Growing Forest", emoji: "🏕️", minXp: 700 },
  { level: 6, title: "Forest Guardian", emoji: "🏞️", minXp: 1300 },
  { level: 7, title: "Eco Legend", emoji: "🌍", minXp: 2500 },
];

export function computeXp(history: ScanRecord[]): number {
  return history.reduce((total, record) => total + XP_TABLE[record.verdict], 0);
}

export interface LevelProgress {
  level: Level;
  next: Level | null;
  xp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPct: number;
}

export function getLevelProgress(xp: number): LevelProgress {
  let current = LEVELS[0];
  let next: Level | null = null;

  for (let i = 0; i < LEVELS.length; i += 1) {
    if (xp >= LEVELS[i].minXp) {
      current = LEVELS[i];
      next = LEVELS[i + 1] ?? null;
    }
  }

  const xpIntoLevel = xp - current.minXp;
  const xpForNextLevel = next ? next.minXp - current.minXp : Math.max(xpIntoLevel, 1);
  const progressPct = next ? Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100)) : 100;

  return { level: current, next, xp, xpIntoLevel, xpForNextLevel, progressPct };
}

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  isUnlocked: (history: ScanRecord[], streak: number) => boolean;
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
    isUnlocked: (h) => h.length >= 1,
  },
  {
    id: "five_scans",
    name: "Getting Started",
    emoji: "📦",
    description: "Scan 5 items",
    isUnlocked: (h) => h.length >= 5,
  },
  {
    id: "fifty_scans",
    name: "Sorting Pro",
    emoji: "🏆",
    description: "Scan 50 items",
    isUnlocked: (h) => h.length >= 50,
  },
  {
    id: "streak_3",
    name: "3-Day Streak",
    emoji: "🔥",
    description: "Scan on 3 days in a row",
    isUnlocked: (_h, streak) => streak >= 3,
  },
  {
    id: "streak_7",
    name: "Week Warrior",
    emoji: "🔥🔥",
    description: "Scan on 7 days in a row",
    isUnlocked: (_h, streak) => streak >= 7,
  },
  {
    id: "recycle_20",
    name: "Recycling Champion",
    emoji: "♻️",
    description: "Recycle 20 items",
    isUnlocked: (h) => countVerdict(h, "recycle") >= 20,
  },
  {
    id: "compost_10",
    name: "Compost Master",
    emoji: "🌿",
    description: "Compost 10 items",
    isUnlocked: (h) => countVerdict(h, "compost") >= 10,
  },
  {
    id: "special_5",
    name: "Hazard Handler",
    emoji: "⚠️",
    description: "Correctly route 5 special drop-off items",
    isUnlocked: (h) => countVerdict(h, "special_dropoff") >= 5,
  },
  {
    id: "all_categories",
    name: "Category Master",
    emoji: "🎯",
    description: "Get at least one of every verdict type",
    isUnlocked: (h) => {
      const verdicts = new Set(h.map((record) => record.verdict));
      return (
        verdicts.has("recycle") &&
        verdicts.has("compost") &&
        verdicts.has("trash") &&
        verdicts.has("special_dropoff")
      );
    },
  },
];

export function getUnlockedBadgeIds(history: ScanRecord[], streak: number): Set<string> {
  return new Set(BADGES.filter((badge) => badge.isUnlocked(history, streak)).map((badge) => badge.id));
}

export interface DailyChallenge {
  id: string;
  description: string;
  target: number;
  progress: (todayHistory: ScanRecord[]) => number;
}

export const DAILY_CHALLENGES: DailyChallenge[] = [
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
