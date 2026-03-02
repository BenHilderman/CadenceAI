"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Clock } from "lucide-react";
import type { Slot } from "@/lib/types";

interface SlotCardsProps {
  slots: Slot[];
}

export function SlotCards({ slots }: SlotCardsProps) {
  if (slots.length === 0) return null;

  const maxScore = Math.max(...slots.map((s) => s.score), 1);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
        <Clock size={12} className="text-white" />
        <span className="text-[11px] font-mono uppercase tracking-widest text-muted">
          Available Slots
        </span>
      </div>
      <div className="p-3 space-y-2">
        <AnimatePresence initial={false}>
          {slots.map((slot, i) => (
            <motion.div
              key={slot.start_time}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className={`relative rounded-xl p-4 border transition-all overflow-hidden ${
                i === 0
                  ? "bg-white/[0.06] border-white/10"
                  : "bg-surface-raised border-border"
              }`}
            >
              {/* Rank number watermark */}
              <span
                className="absolute top-1 right-3 text-[42px] font-bold leading-none pointer-events-none select-none"
                style={{ opacity: 0.06 }}
              >
                #{i + 1}
              </span>

              {/* Shimmer reveal overlay */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{ duration: 1, delay: i * 0.1 + 0.2, ease: "easeInOut" }}
              />

              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-base font-semibold ${i === 0 ? "text-white" : "text-foreground"}`}>
                    {slot.display_time}
                  </span>
                  {i === 0 && (
                    <span className="relative text-[10px] font-mono uppercase tracking-wider text-white bg-white/10 px-2 py-0.5 rounded-full overflow-hidden">
                      Best
                      <span
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                        style={{ animation: "shimmer 2s ease-in-out infinite" }}
                      />
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted mb-2.5">{slot.reason}</p>

                {/* Score bar */}
                <div className="h-1 rounded-full bg-border/50 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      i === 0
                        ? "bg-gradient-to-r from-white/60 to-white"
                        : "bg-muted/40"
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(slot.score / maxScore) * 100}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08 + 0.3, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
