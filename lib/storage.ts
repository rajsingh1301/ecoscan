import type { CleanupRecord, ScanRecord, UserLocation } from "@/lib/types";

/**
 * One cap for every writer. Adding a record used to trim to 200 while a sync
 * wrote 500, so the first scan after a sync silently dropped 300 rows locally.
 */
const MAX_RECORDS = 500;

const GUEST_KEY = "ecoscan:guest";
const LOCATION_KEY = "ecoscan:location";
const HISTORY_KEY = "ecoscan:history";
const CLEANUPS_KEY = "ecoscan:cleanups";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Guest mode lets someone use the whole app before deciding to make an
 * account. Everything they do stays in this browser until they sign in, at
 * which point the sync merges it into the account rather than discarding it.
 */
export function isGuest(): boolean {
  if (!isBrowser()) return false;
  return window.localStorage.getItem(GUEST_KEY) === "true";
}

export function setGuest(on: boolean): void {
  if (!isBrowser()) return;
  if (on) window.localStorage.setItem(GUEST_KEY, "true");
  else window.localStorage.removeItem(GUEST_KEY);
}

export function getLocation(): UserLocation | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(LOCATION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserLocation;
  } catch {
    return null;
  }
}

export function setLocation(location: UserLocation): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
}

export function getHistory(): ScanRecord[] {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ScanRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addScanRecord(record: ScanRecord): void {
  if (!isBrowser()) return;
  const history = getHistory();
  history.unshift(record);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_RECORDS)));
}

export function replaceHistory(records: ScanRecord[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
}

export function replaceCleanups(records: CleanupRecord[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(CLEANUPS_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
}

export function clearHistory(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(HISTORY_KEY);
  window.localStorage.removeItem(CLEANUPS_KEY);
}

export function getCleanups(): CleanupRecord[] {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(CLEANUPS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CleanupRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addCleanupRecord(record: CleanupRecord): void {
  if (!isBrowser()) return;
  const cleanups = getCleanups();
  cleanups.unshift(record);
  window.localStorage.setItem(CLEANUPS_KEY, JSON.stringify(cleanups.slice(0, MAX_RECORDS)));
}

export function getStreakDays(history: ScanRecord[]): number {
  if (history.length === 0) return 0;

  const scanDates = new Set(
    history.map((record) => new Date(record.timestamp).toDateString())
  );

  let streak = 0;
  const cursor = new Date();

  while (scanDates.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
