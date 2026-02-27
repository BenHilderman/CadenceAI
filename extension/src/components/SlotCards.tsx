import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Slot } from "../lib/types";

interface SlotCardsProps {
  slots: Slot[];
  compact?: boolean;
}

export function SlotCards({ slots, compact }: SlotCardsProps) {
  if (slots.length === 0) return null;

  const maxScore = Math.max(...slots.map((s) => s.score), 1);

  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontFamily: "monospace",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          color: "#64647a",
          marginBottom: 8,
          paddingLeft: 2,
        }}
      >
        Available Slots
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: compact ? 6 : 8 }}>
        <AnimatePresence initial={false}>
          {slots.map((slot, i) => (
            <motion.div
              key={slot.start_time}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              style={{
                position: "relative",
                borderRadius: 12,
                padding: compact ? "10px 12px" : "14px 16px",
                border: `1px solid ${i === 0 ? "rgba(108, 92, 231, 0.2)" : "#1e1e2a"}`,
                background: i === 0 ? "rgba(108, 92, 231, 0.08)" : "#13131a",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: compact ? 13 : 14,
                    fontWeight: 600,
                    color: i === 0 ? "#a78bfa" : "#f5f5f7",
                  }}
                >
                  {slot.display_time}
                </span>
                {i === 0 && (
                  <span
                    style={{
                      fontSize: 9,
                      fontFamily: "monospace",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "#a78bfa",
                      background: "rgba(108, 92, 231, 0.15)",
                      padding: "2px 8px",
                      borderRadius: 999,
                    }}
                  >
                    Best
                  </span>
                )}
              </div>
              <p
                style={{
                  fontSize: 11,
                  color: "#64647a",
                  marginBottom: 6,
                  lineHeight: 1.4,
                }}
              >
                {slot.reason}
              </p>
              <div
                style={{
                  height: 3,
                  borderRadius: 2,
                  background: "rgba(30, 30, 42, 0.5)",
                  overflow: "hidden",
                }}
              >
                <motion.div
                  style={{
                    height: "100%",
                    borderRadius: 2,
                    background: i === 0
                      ? "linear-gradient(to right, #6c5ce7, #a78bfa)"
                      : "rgba(100, 100, 122, 0.4)",
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(slot.score / maxScore) * 100}%` }}
                  transition={{ duration: 0.6, delay: i * 0.08 + 0.3 }}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
