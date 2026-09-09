import type { ScanRecord, UserLocation } from "@/lib/types";

const LOCATION_KEY = "ecoscan:location";
const HISTORY_KEY = "ecoscan:history";

function isBrowser(): boolean {
  return typeof window !== "undefined";
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
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 200)));
}

export function clearHistory(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(HISTORY_KEY);
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
