"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";

interface SlotData {
  start_time: string;
  end_time: string;
  display_time: string;
  score: number;
  reason: string;
}

interface SlotPickerProps {
  slug: string;
  durations: number[];
  daysAhead: number;
  duration: number;
  onDurationChange: (d: number) => void;
  onSlotSelect: (slot: { start_time: string; end_time: string; display_time: string }) => void;
  apiUrl: string;
}

function formatDateLabel(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === tomorrow.getTime()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function SlotPicker({
  slug,
  durations,
  daysAhead,
  duration,
  onDurationChange,
  onSlotSelect,
  apiUrl,
}: SlotPickerProps) {
  const dates = useMemo(() => {
    const arr: Date[] = [];
    const today = new Date();
    for (let i = 0; i < daysAhead; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [daysAhead]);

  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateScrollStart, setDateScrollStart] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const selectedDate = dates[selectedDateIdx];
  const dateStr = toYMD(selectedDate);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setSlots([]);

    fetch(`${apiUrl}/api/booking/slots?date=${dateStr}&duration=${duration}&slug=${slug}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load slots");
        return res.json();
      })
      .then((data) => {
        setSlots(data.slots || []);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [dateStr, duration, slug, apiUrl]);

  const visibleDates = dates.slice(dateScrollStart, dateScrollStart + 7);
  const canScrollLeft = dateScrollStart > 0;
  const canScrollRight = dateScrollStart + 7 < dates.length;

  return (
    <div className="space-y-6">
      {/* Duration selector */}
      <div>
        <label className="text-[11px] font-mono uppercase tracking-widest text-muted mb-2 block">
          Duration
        </label>
        <div className="flex gap-2">
          {durations.map((d) => (
            <motion.button
              key={d}
              onClick={() => onDurationChange(d)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-pressed={d === duration}
              className={`focus-ring px-4 py-2 rounded-full text-sm font-medium transition-all ${
                d === duration
                  ? "bg-white/15 text-white glow-accent"
                  : "bg-surface-raised border border-border text-muted hover:text-foreground hover:border-white/20"
              }`}
            >
              {d} min
            </motion.button>
          ))}
        </div>
      </div>

      {/* Date picker */}
      <div>
        <label className="text-[11px] font-mono uppercase tracking-widest text-muted mb-2 block">
          Date
        </label>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDateScrollStart(Math.max(0, dateScrollStart - 7))}
            disabled={!canScrollLeft}
            aria-label="Previous week"
            className="focus-ring min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface-raised disabled:opacity-20 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex gap-1.5 flex-1 overflow-hidden">
            {visibleDates.map((d, i) => {
              const globalIdx = dateScrollStart + i;
              const isSelected = globalIdx === selectedDateIdx;
              return (
                <motion.button
                  key={toYMD(d)}
                  onClick={() => setSelectedDateIdx(globalIdx)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className={`focus-ring flex-1 min-w-0 py-2 px-1 rounded-lg text-center transition-all ${
                    isSelected
                      ? "bg-white/10 border border-white/20 text-white"
                      : "bg-surface-raised border border-border text-muted hover:text-foreground hover:border-white/15"
                  }`}
                >
                  <div className="text-[10px] font-mono uppercase truncate">
                    {d.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div className="text-sm font-semibold">{d.getDate()}</div>
                </motion.button>
              );
            })}
          </div>

          <button
            onClick={() =>
              setDateScrollStart(Math.min(dates.length - 7, dateScrollStart + 7))
            }
            disabled={!canScrollRight}
            aria-label="Next week"
            className="focus-ring min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface-raised disabled:opacity-20 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <p className="text-xs text-muted mt-1.5">{formatDateLabel(selectedDate)}</p>
      </div>

      {/* Slot grid */}
      <div>
        <label className="text-[11px] font-mono uppercase tracking-widest text-muted mb-2 block">
          Available Times
        </label>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-xl bg-surface-raised border border-border shimmer-overlay"
              />
            ))}
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-xl bg-surface-raised border border-red-500/20 p-4 text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && slots.length === 0 && (
          <div role="status" className="rounded-xl bg-surface-raised border border-border p-6 text-center">
            <Clock size={20} className="mx-auto text-muted mb-2" />
            <p className="text-sm text-muted">No available slots on this day</p>
            <p className="text-xs text-muted/60 mt-1">Try a different date or duration</p>
          </div>
        )}

        {!loading && !error && slots.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <AnimatePresence initial={false}>
              {slots.map((slot, i) => {
                const time = new Date(slot.start_time).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                });
                return (
                  <motion.button
                    key={slot.start_time}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onSlotSelect(slot)}
                    className="focus-ring relative py-3 px-2 rounded-xl bg-surface-raised border border-border text-sm font-medium text-foreground hover:border-white/25 hover:bg-white/[0.06] hover:shadow-[0_0_20px_rgba(255,255,255,0.08)] transition-all group overflow-hidden"
                  >
                    {/* Shimmer on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative">{time}</span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
