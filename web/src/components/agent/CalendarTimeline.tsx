"use client";

import { useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Check } from "lucide-react";
import type { Slot, BusyBlock, BookedEvent } from "@/lib/types";

interface CalendarTimelineProps {
  date: string;
  busyBlocks: BusyBlock[];
  slots: Slot[];
  bookedEvent: BookedEvent | null;
  onSlotClick?: (slot: Slot) => void;
  pendingSlotTime?: string | null;
  compact?: boolean;
}

const START_HOUR = 8;
const END_HOUR = 18;
const TOTAL_HOURS = END_HOUR - START_HOUR;

function timeToOffset(isoOrTime: string, hourPx: number): number {
  const d = new Date(isoOrTime);
  const hours = d.getHours() + d.getMinutes() / 60;
  return (hours - START_HOUR) * hourPx;
}

function blockHeight(start: string, end: string, hourPx: number): number {
  const s = new Date(start);
  const e = new Date(end);
  const durationHours = (e.getTime() - s.getTime()) / (1000 * 60 * 60);
  return Math.max(durationHours * hourPx, 4);
}

function formatHeaderDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function isToday(dateStr: string): boolean {
  const today = new Date();
  const d = new Date(dateStr + "T12:00:00");
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

function NowLine({ hourPx }: { hourPx: number }) {
  const now = new Date();
  const hours = now.getHours() + now.getMinutes() / 60;
  if (hours < START_HOUR || hours > END_HOUR) return null;

  const top = (hours - START_HOUR) * hourPx;

  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top }}>
      <div className="flex items-center">
        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
        <div className="flex-1 h-px bg-red-500/60" />
      </div>
    </div>
  );
}

export function CalendarTimeline({
  date,
  busyBlocks,
  slots,
  bookedEvent,
  onSlotClick,
  pendingSlotTime = null,
  compact = false,
}: CalendarTimelineProps) {
  const hourPx = compact ? 32 : 48;
  const totalHeight = TOTAL_HOURS * hourPx;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter out any slot whose start_time matches the booked event
  const visibleSlots = useMemo(
    () => bookedEvent ? slots.filter((s) => s.start_time !== bookedEvent.start) : slots,
    [slots, bookedEvent]
  );
  const maxScore = useMemo(() => Math.max(...visibleSlots.map((s) => s.score), 1), [visibleSlots]);

  // Scroll to first slot or current time on mount
  useEffect(() => {
    if (!scrollRef.current) return;
    const firstSlot = slots[0];
    if (firstSlot) {
      const offset = timeToOffset(firstSlot.start_time, hourPx);
      scrollRef.current.scrollTop = Math.max(offset - hourPx, 0);
    }
  }, [slots, hourPx]);

  const hours = useMemo(
    () => Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i),
    []
  );

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Calendar size={12} className="text-white" />
          <span className="text-[11px] font-mono uppercase tracking-widest text-muted">
            {formatHeaderDate(date)}
          </span>
        </div>
        {visibleSlots.length > 0 && (
          <span className="text-[10px] font-mono bg-white/10 text-white px-2 py-0.5 rounded-full">
            {visibleSlots.length} slot{visibleSlots.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Timeline */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: compact ? 280 : 420 }}>
        <div className="relative ml-12 mr-3 my-2" style={{ height: totalHeight }}>
          {/* Hour grid lines + labels */}
          {hours.map((hour) => {
            const top = (hour - START_HOUR) * hourPx;
            const label =
              hour === 0
                ? "12 AM"
                : hour < 12
                  ? `${hour} AM`
                  : hour === 12
                    ? "12 PM"
                    : `${hour - 12} PM`;
            return (
              <div key={hour} className="absolute left-0 right-0" style={{ top }}>
                <span className="absolute -left-11 -top-1.5 text-[10px] font-mono text-muted/50 w-9 text-right">
                  {label}
                </span>
                <div className="h-px bg-white/[0.04]" />
              </div>
            );
          })}

          {/* Lunch zone 12–1 PM */}
          {START_HOUR <= 12 && END_HOUR >= 13 && (
            <div
              className="absolute left-0 right-0 border border-dashed border-amber-500/10 bg-amber-500/[0.02] rounded"
              style={{
                top: (12 - START_HOUR) * hourPx,
                height: hourPx,
              }}
            />
          )}

          {/* Busy blocks */}
          {busyBlocks.map((block, i) => {
            const top = timeToOffset(block.start, hourPx);
            const height = blockHeight(block.start, block.end, hourPx);
            if (top + height < 0 || top > totalHeight) return null;

            return (
              <motion.div
                key={`busy-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-0 right-0 bg-white/[0.03] border border-white/[0.06] rounded-lg flex items-center px-3 overflow-hidden"
                style={{ top: Math.max(top, 0), height }}
              >
                <span className="text-[10px] font-mono text-muted/40 uppercase">Busy</span>
              </motion.div>
            );
          })}

          {/* Available slots */}
          {visibleSlots.map((slot, i) => {
            const top = timeToOffset(slot.start_time, hourPx);
            const height = blockHeight(slot.start_time, slot.end_time, hourPx);
            const isBest = i === 0;
            const isPending = slot.start_time === pendingSlotTime;
            if (top + height < 0 || top > totalHeight) return null;

            return (
              <motion.button
                key={`slot-${slot.start_time}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.3,
                  delay: (busyBlocks.length + i) * 0.06,
                  ease: [0.16, 1, 0.3, 1],
                }}
                onClick={() => onSlotClick?.(slot)}
                disabled={!!pendingSlotTime}
                className={`absolute left-0 right-0 rounded-lg border px-3 flex items-center justify-between overflow-hidden transition-all ${
                  isPending
                    ? "bg-white/10 border-white/25 animate-pulse cursor-wait"
                    : pendingSlotTime
                      ? "bg-white/[0.03] border-white/[0.06] opacity-50 cursor-default"
                      : isBest
                        ? "bg-white/[0.08] border-white/15 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                        : "bg-white/[0.04] border-white/[0.08] cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                }`}
                style={{ top: Math.max(top, 0), height }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`text-xs font-semibold truncate ${
                      isPending ? "text-white" : isBest ? "text-white" : "text-foreground/80"
                    }`}
                  >
                    {slot.display_time}
                  </span>
                  {isPending ? (
                    <span className="text-[9px] font-mono uppercase tracking-wider text-white bg-white/10 px-1.5 py-0.5 rounded-full shrink-0">
                      Booking…
                    </span>
                  ) : isBest ? (
                    <span className="text-[9px] font-mono uppercase tracking-wider text-white bg-white/10 px-1.5 py-0.5 rounded-full shrink-0">
                      Best
                    </span>
                  ) : null}
                </div>
                {!isPending && (
                  <span className="text-[10px] font-mono text-muted/50 shrink-0">
                    {Math.round((slot.score / maxScore) * 100)}
                  </span>
                )}
              </motion.button>
            );
          })}

          {/* Booked event */}
          {bookedEvent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-0 right-0 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 flex items-center gap-2 overflow-hidden z-10"
              style={{
                top: Math.max(timeToOffset(bookedEvent.start, hourPx), 0),
                height: blockHeight(bookedEvent.start, bookedEvent.end, hourPx),
              }}
            >
              <Check size={12} className="text-emerald-400 shrink-0" />
              <span className="text-xs font-semibold text-emerald-400 truncate">
                {bookedEvent.title}
              </span>
            </motion.div>
          )}

          {/* Now line */}
          {isToday(date) && <NowLine hourPx={hourPx} />}
        </div>
      </div>
    </div>
  );
}
