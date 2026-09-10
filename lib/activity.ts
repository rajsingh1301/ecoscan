import type { CleanupRecord, ScanRecord } from "@/lib/types";

/** Local calendar day, so a day boundary matches the user's own midnight. */
function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export type Activity = Map<string, number>;

export function buildActivity(history: ScanRecord[], cleanups: CleanupRecord[]): Activity {
  const activity: Activity = new Map();

  for (const record of [...history, ...cleanups]) {
    const key = dayKey(new Date(record.timestamp));
    activity.set(key, (activity.get(key) ?? 0) + 1);
  }

  return activity;
}

export function getActiveDays(activity: Activity): number {
  return activity.size;
}

export function getLongestStreak(activity: Activity): number {
  if (activity.size === 0) return 0;

  const days = [...activity.keys()].sort();
  let longest = 1;
  let run = 1;

  for (let i = 1; i < days.length; i += 1) {
    const previous = new Date(`${days[i - 1]}T00:00:00`);
    const current = new Date(`${days[i]}T00:00:00`);
    const gapDays = Math.round((current.getTime() - previous.getTime()) / 86_400_000);

    run = gapDays === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  return longest;
}

export interface DayCell {
  key: string;
  date: Date;
  count: number;
  isToday: boolean;
  isFuture: boolean;
}

/**
 * Columns of seven, Sunday at the top, ending with the current week — the
 * shape a contribution grid is read in.
 */
export function buildCalendar(weeks: number, activity: Activity): DayCell[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = dayKey(today);

  // Walk back to the Sunday that starts the earliest week shown.
  const start = new Date(today);
  start.setDate(start.getDate() - (weeks - 1) * 7 - today.getDay());

  const columns: DayCell[][] = [];

  for (let week = 0; week < weeks; week += 1) {
    const column: DayCell[] = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + week * 7 + weekday);
      const key = dayKey(date);
      column.push({
        key,
        date,
        count: activity.get(key) ?? 0,
        isToday: key === todayKey,
        isFuture: date.getTime() > today.getTime(),
      });
    }
    columns.push(column);
  }

  return columns;
}

export function intensityOf(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}
