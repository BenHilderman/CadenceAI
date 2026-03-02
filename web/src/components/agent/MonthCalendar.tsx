"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMonthCalendar } from "@/hooks/useMonthCalendar";
import type { MonthEvent, BookedEvent } from "@/lib/types";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface MonthCalendarProps {
  sessionId: string | null;
  compact?: boolean;
  bookedEvent?: BookedEvent | null;
}

interface DayCellData {
  day: number;
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: MonthEvent[];
}

function buildGrid(year: number, month: number, eventsByDate: Record<string, MonthEvent[]>): DayCellData[] {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const firstOfMonth = new Date(year, month - 1, 1);
  const startDow = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  // Previous month fill
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();

  const cells: DayCellData[] = [];

  for (let i = startDow - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const dateKey = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ day, dateKey, isCurrentMonth: false, isToday: dateKey === todayStr, events: eventsByDate[dateKey] || [] });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, dateKey, isCurrentMonth: true, isToday: dateKey === todayStr, events: eventsByDate[dateKey] || [] });
  }

  // Fill remaining cells to complete the last row
  const remainder = cells.length % 7;
  if (remainder > 0) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    for (let d = 1; d <= 7 - remainder; d++) {
      const dateKey = `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, dateKey, isCurrentMonth: false, isToday: dateKey === todayStr, events: eventsByDate[dateKey] || [] });
    }
  }

  return cells;
}

function formatEventTime(event: MonthEvent): string {
  if (event.all_day) return "All day";
  try {
    const fmt = { hour: "numeric" as const, minute: "2-digit" as const };
    const start = new Date(event.start).toLocaleTimeString([], fmt);
    const end = new Date(event.end).toLocaleTimeString([], fmt);
    return `${start} – ${end}`;
  } catch {
    return "";
  }
}

export function MonthCalendar({ sessionId, compact, bookedEvent }: MonthCalendarProps) {
  const { year, month, data, isLoading, goToPrevMonth, goToNextMonth, goToMonth, refetch } = useMonthCalendar(sessionId);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const autoExpandedRef = useRef(false);
  const lastBookedIdRef = useRef<string | null>(null);

  // Refetch and navigate to booked event's month when a new booking happens
  useEffect(() => {
    if (!bookedEvent || bookedEvent.id === lastBookedIdRef.current) return;
    lastBookedIdRef.current = bookedEvent.id;

    const eventDate = new Date(bookedEvent.start);
    const eventYear = eventDate.getFullYear();
    const eventMonth = eventDate.getMonth() + 1;
    const eventDay = eventDate.getDate();
    const dateKey = `${eventYear}-${String(eventMonth).padStart(2, "0")}-${String(eventDay).padStart(2, "0")}`;

    // Navigate to the event's month and refetch
    goToMonth(eventYear, eventMonth);
    // Small delay to let the fetch for the new month complete, then select the day
    const timer = setTimeout(() => {
      refetch();
      setSelectedDate(dateKey);
    }, 500);
    return () => clearTimeout(timer);
  }, [bookedEvent, goToMonth, refetch]);

  const eventsByDate = data?.events_by_date ?? {};

  const grid = useMemo(() => buildGrid(year, month, eventsByDate), [year, month, eventsByDate]);

  // Auto-expand today when data loads on the current month
  useEffect(() => {
    if (autoExpandedRef.current || isLoading || !data) return;
    const today = new Date();
    if (today.getFullYear() === year && today.getMonth() + 1 === month) {
      const todayKey = `${year}-${String(month).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      if (eventsByDate[todayKey]?.length) {
        setSelectedDate(todayKey);
      }
      autoExpandedRef.current = true;
    }
  }, [year, month, data, isLoading, eventsByDate]);

  const selectedEvents = selectedDate ? eventsByDate[selectedDate] ?? [] : [];

  return (
    <div className={`flex flex-col ${compact ? "p-3" : "p-4"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={goToPrevMonth}
          className="p-1 rounded-md hover:bg-white/10 transition-colors text-muted hover:text-foreground"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-[11px] font-mono uppercase tracking-widest text-muted">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button
          onClick={goToNextMonth}
          className="p-1 rounded-md hover:bg-white/10 transition-colors text-muted hover:text-foreground"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-mono text-muted/50 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {isLoading
          ? Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center justify-center py-1.5">
                <div className="w-6 h-6 rounded-full bg-white/5 animate-pulse" />
              </div>
            ))
          : grid.map((cell, i) => {
              const hasEvents = cell.events.length > 0;
              const isSelected = selectedDate === cell.dateKey;

              return (
                <button
                  key={i}
                  onClick={() => {
                    if (cell.isCurrentMonth) {
                      setSelectedDate(isSelected ? null : cell.dateKey);
                    }
                  }}
                  className={`
                    flex flex-col items-center justify-center py-1.5 rounded-lg transition-colors
                    ${cell.isCurrentMonth ? "cursor-pointer hover:bg-white/10" : "cursor-default"}
                    ${isSelected ? "bg-white/15" : ""}
                  `}
                >
                  <span
                    className={`
                      text-[11px] font-mono leading-none
                      ${cell.isToday ? "bg-white/15 rounded-full w-6 h-6 flex items-center justify-center font-semibold text-foreground" : ""}
                      ${!cell.isToday && cell.isCurrentMonth ? "text-foreground/80" : ""}
                      ${!cell.isToday && !cell.isCurrentMonth ? "text-muted/30" : ""}
                    `}
                  >
                    {cell.day}
                  </span>
                  {hasEvents ? (
                    <span className="text-[8px] font-mono leading-none text-white/60 mt-0.5">
                      {cell.events.length}
                    </span>
                  ) : (
                    <span className="text-[8px] leading-none mt-0.5 invisible">0</span>
                  )}
                </button>
              );
            })}
      </div>

      {/* Expanded event list */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-white/[0.06] flex flex-col gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted/50 mb-0.5">
                {new Date(selectedDate + "T12:00:00").toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              {selectedEvents.length > 0 ? (
                selectedEvents.map((ev, i) => (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.15 }}
                    className="flex items-center gap-2 text-[10px] font-mono"
                  >
                    <span className="text-muted/50 w-[120px] shrink-0">{formatEventTime(ev)}</span>
                    <span className="text-foreground/80 truncate">{ev.title}</span>
                  </motion.div>
                ))
              ) : (
                <span className="text-[11px] font-mono text-muted/40">No events</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
