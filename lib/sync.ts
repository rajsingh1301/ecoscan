import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  getCleanups,
  getHistory,
  replaceCleanups,
  replaceHistory,
} from "@/lib/storage";
import { computeTotalXp } from "@/lib/gamification";
import type { CleanupRecord, ScanRecord } from "@/lib/types";

/**
 * Progress sync is deliberately local-first: the app is fully usable with no
 * account, and signing in makes the same records durable and portable rather
 * than switching the app to a different source of truth.
 *
 * Records carry client-generated UUIDs, so merging is a union by id and every
 * write is an idempotent upsert — running a sync twice changes nothing.
 */

async function currentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const { data } = await createClient().auth.getUser();
  return data.user?.id ?? null;
}

function scanToRow(record: ScanRecord, userId: string) {
  return {
    id: record.id,
    user_id: userId,
    item_name: record.itemName,
    material_category: record.materialCategory,
    verdict: record.verdict,
    confidence: record.confidence,
    created_at: record.timestamp,
  };
}

function cleanupToRow(record: CleanupRecord, userId: string) {
  return {
    id: record.id,
    user_id: userId,
    total_items_before: record.totalItemsBefore,
    items_removed: record.itemsRemoved,
    xp_earned: record.xpEarned,
    lat: record.lat ?? null,
    lng: record.lng ?? null,
    created_at: record.timestamp,
  };
}

interface ScanRow {
  id: string;
  item_name: string;
  material_category: string;
  verdict: string;
  confidence: string;
  created_at: string;
}

interface CleanupRow {
  id: string;
  total_items_before: number;
  items_removed: number;
  xp_earned: number;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

function rowToScan(row: ScanRow): ScanRecord {
  return {
    id: row.id,
    timestamp: row.created_at,
    itemName: row.item_name,
    materialCategory: row.material_category as ScanRecord["materialCategory"],
    verdict: row.verdict as ScanRecord["verdict"],
    confidence: row.confidence as ScanRecord["confidence"],
  };
}

function rowToCleanup(row: CleanupRow): CleanupRecord {
  return {
    id: row.id,
    timestamp: row.created_at,
    totalItemsBefore: row.total_items_before,
    itemsRemoved: row.items_removed,
    xpEarned: row.xp_earned,
    ...(row.lat !== null && row.lng !== null ? { lat: row.lat, lng: row.lng } : {}),
  };
}

/** Mirrors one new scan up. Fire-and-forget: a failure must never block the UI. */
export async function pushScan(record: ScanRecord): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await createClient().from("scans").upsert(scanToRow(record, userId));
}

export async function pushCleanup(record: CleanupRecord): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await createClient().from("cleanups").upsert(cleanupToRow(record, userId));
}

/**
 * Clearing history has to reach the account too. Without this the next sync
 * pulls everything straight back and the button looks broken.
 */
export async function clearRemoteProgress(): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;

  const supabase = createClient();
  await Promise.all([
    supabase.from("scans").delete().eq("user_id", userId),
    supabase.from("cleanups").delete().eq("user_id", userId),
    supabase.from("profiles").update({ total_xp: 0 }).eq("id", userId),
  ]);
}

function mergeById<T extends { id: string; timestamp: string }>(a: T[], b: T[]): T[] {
  const byId = new Map<string, T>();
  for (const record of [...a, ...b]) byId.set(record.id, record);
  return [...byId.values()].sort(
    (x, y) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime()
  );
}

export interface SyncResult {
  synced: boolean;
  scans: number;
  cleanups: number;
}

/**
 * Two-way merge. Pulls everything the account already has, unions it with what
 * this device holds, writes the union to both sides, and refreshes the profile's
 * cached XP so the community feed can show a level without recomputing.
 */
export async function syncProgress(): Promise<SyncResult> {
  const userId = await currentUserId();
  if (!userId) return { synced: false, scans: 0, cleanups: 0 };

  const supabase = createClient();

  const [{ data: scanRows }, { data: cleanupRows }] = await Promise.all([
    supabase.from("scans").select("*").eq("user_id", userId),
    supabase.from("cleanups").select("*").eq("user_id", userId),
  ]);

  const remoteScans = ((scanRows ?? []) as ScanRow[]).map(rowToScan);
  const remoteCleanups = ((cleanupRows ?? []) as CleanupRow[]).map(rowToCleanup);

  const mergedScans = mergeById(getHistory(), remoteScans);
  const mergedCleanups = mergeById(getCleanups(), remoteCleanups);

  replaceHistory(mergedScans);
  replaceCleanups(mergedCleanups);

  const remoteScanIds = new Set(remoteScans.map((r) => r.id));
  const remoteCleanupIds = new Set(remoteCleanups.map((r) => r.id));

  const scansToPush = mergedScans.filter((r) => !remoteScanIds.has(r.id));
  const cleanupsToPush = mergedCleanups.filter((r) => !remoteCleanupIds.has(r.id));

  if (scansToPush.length > 0) {
    await supabase.from("scans").upsert(scansToPush.map((r) => scanToRow(r, userId)));
  }
  if (cleanupsToPush.length > 0) {
    await supabase.from("cleanups").upsert(cleanupsToPush.map((r) => cleanupToRow(r, userId)));
  }

  await supabase
    .from("profiles")
    .update({ total_xp: computeTotalXp(mergedScans, mergedCleanups) })
    .eq("id", userId);

  return { synced: true, scans: mergedScans.length, cleanups: mergedCleanups.length };
}
