"use client";

import { useEffect, useRef, useState } from "react";
import { getCleanups, getHistory, getStreakDays } from "@/lib/storage";
import {
  buildActivity,
  buildCalendar,
  getActiveDays,
  getLongestStreak,
  intensityOf,
  type DayCell,
} from "@/lib/activity";

const WEEKS = 26;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function StreakCalendar() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState<DayCell[][] | null>(null);
  const [current, setCurrent] = useState(0);
  const [longest, setLongest] = useState(0);
  const [activeDays, setActiveDays] = useState(0);

  useEffect(() => {
    const history = getHistory();
    const cleanups = getCleanups();
    const activity = buildActivity(history, cleanups);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColumns(buildCalendar(WEEKS, activity));
    setCurrent(getStreakDays(history));
    setLongest(getLongestStreak(activity));
    setActiveDays(getActiveDays(activity));
  }, []);

  // The grid is wider than a phone, so open it on the most recent weeks.
  useEffect(() => {
    if (columns && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [columns]);

  if (!columns) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="rule-label">
        <span className="eyebrow">Streak</span>
      </div>

      <div className="flex gap-6">
        <div>
          <p className="streak-figure">{current}</p>
          <p className="eyebrow">Current</p>
        </div>
        <div>
          <p className="streak-figure">{longest}</p>
          <p className="eyebrow">Longest</p>
        </div>
        <div>
          <p className="streak-figure">{activeDays}</p>
          <p className="eyebrow">Active days</p>
        </div>
      </div>

      <div className="cal-scroll" ref={scrollRef}>
        <div className="cal">
          <div className="cal-months">
            {columns.map((column, index) => {
              const first = column[0];
              const showLabel =
                index === 0 ? false : first.date.getDate() <= 7 && first.date.getDay() === 0;
              return (
                <span key={first.key} className="cal-month">
                  {showLabel ? MONTHS[first.date.getMonth()] : ""}
                </span>
              );
            })}
          </div>

          <div className="cal-grid">
            {columns.map((column) => (
              <div key={column[0].key} className="cal-week">
                {column.map((cell) => (
                  <span
                    key={cell.key}
                    className={`cal-day${cell.isToday ? " is-today" : ""}`}
                    data-level={cell.isFuture ? "none" : intensityOf(cell.count)}
                    title={
                      cell.isFuture
                        ? ""
                        : `${cell.count} on ${cell.date.toLocaleDateString(undefined, {
                            day: "numeric",
                            month: "short",
                          })}`
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[0.7rem]" style={{ color: "var(--ink-faint)" }}>
          Less
        </span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span key={level} className="cal-day" data-level={level} />
        ))}
        <span className="text-[0.7rem]" style={{ color: "var(--ink-faint)" }}>
          More
        </span>
      </div>
    </section>
  );
}
