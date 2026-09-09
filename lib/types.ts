export const MATERIAL_CATEGORIES = [
  "plastic_1_2",
  "plastic_3_7",
  "glass",
  "metal",
  "paper_clean",
  "paper_greasy",
  "organic",
  "e_waste",
  "hazardous",
  "mixed_other",
] as const;

export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export const VERDICTS = ["recycle", "compost", "trash", "special_dropoff"] as const;

export type Verdict = (typeof VERDICTS)[number];

export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;

export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export interface IdentifyResult {
  itemName: string;
  materialCategory: MaterialCategory;
  confidence: ConfidenceLevel;
  reasoning: string;
}

export interface ScanRecord {
  id: string;
  timestamp: string;
  itemName: string;
  materialCategory: MaterialCategory;
  verdict: Verdict;
  confidence: ConfidenceLevel;
}

export interface RegionRules {
  [category: string]: Verdict;
}

export interface RulesDataset {
  regions: {
    default: RegionRules;
    [regionKey: string]: RegionRules;
  };
}

export interface UserLocation {
  regionKey: string;
  label: string;
}

export interface DetectedItem {
  itemName: string;
  materialCategory: MaterialCategory;
  count: number;
}

export interface SceneScanResult {
  items: DetectedItem[];
  totalItems: number;
  recyclableCount: number;
  landfillCount: number;
  availableXp: number;
  note: string;
}

export interface CleanupVerification {
  sameLocation: boolean;
  itemsRemoved: number;
  itemsRemaining: number;
  confidence: ConfidenceLevel;
  notes: string;
}

export interface CleanupRecord {
  id: string;
  timestamp: string;
  totalItemsBefore: number;
  itemsRemoved: number;
  xpEarned: number;
  lat?: number;
  lng?: number;
}

export const POST_TYPES = ["cleanup", "badge", "level", "streak"] as const;

export type PostType = (typeof POST_TYPES)[number];

export interface FeedPost {
  id: string;
  user_id: string;
  type: PostType;
  caption: string | null;
  before_url: string | null;
  after_url: string | null;
  items_removed: number | null;
  xp_earned: number | null;
  badge_id: string | null;
  level_reached: number | null;
  streak_days: number | null;
  city: string;
  created_at: string;
  username: string;
  avatar_emoji: string;
  reaction_count: number;
}

export interface NewPost {
  type: PostType;
  caption?: string;
  beforeImage?: string;
  afterImage?: string;
  itemsRemoved?: number;
  xpEarned?: number;
  badgeId?: string;
  levelReached?: number;
  streakDays?: number;
}
