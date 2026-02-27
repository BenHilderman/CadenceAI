import React from "react";
import { motion } from "framer-motion";
import type { BookedEvent } from "../lib/types";

interface BookingConfirmProps {
  event: BookedEvent;
  compact?: boolean;
}

export function BookingConfirm({ event, compact }: BookingConfirmProps) {
  const startDate = new Date(event.start);
  const endDate = new Date(event.end);
  const dateStr = startDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeStr = `${startDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })} \u2014 ${endDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, type: "spring", bounce: 0.25 }}
      style={{
        borderRadius: 16,
        padding: compact ? "14px 16px" : "20px",
        border: "1px solid rgba(52, 211, 153, 0.2)",
        background: "linear-gradient(135deg, rgba(52, 211, 153, 0.08) 0%, rgba(108, 92, 231, 0.04) 100%)",
        boxShadow: "0 0 40px rgba(52, 211, 153, 0.15), 0 0 80px rgba(52, 211, 153, 0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: compact ? 10 : 14 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "rgba(52, 211, 153, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
          }}
        >
          ✓
        </div>
        <span
          style={{
            fontSize: 11,
            fontFamily: "monospace",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: "#34d399",
          }}
        >
          Booked
        </span>
      </div>

      <h4 style={{ fontSize: compact ? 15 : 18, fontWeight: 600, color: "#f5f5f7", marginBottom: 4 }}>
        {event.title}
      </h4>
      <p style={{ fontSize: 13, color: "#64647a", marginBottom: 2 }}>{dateStr}</p>
      <p style={{ fontSize: 13, color: "#64647a", marginBottom: compact ? 10 : 14 }}>{timeStr}</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {event.meet_link && (
          <a
            href={event.meet_link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              borderRadius: 999,
              background: "rgba(108, 92, 231, 0.15)",
              border: "1px solid rgba(108, 92, 231, 0.2)",
              padding: "6px 16px",
              fontSize: 11,
              fontWeight: 600,
              color: "#a78bfa",
              textDecoration: "none",
            }}
          >
            Join Meet
          </a>
        )}
        {event.html_link && (
          <a
            href={event.html_link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              borderRadius: 999,
              background: "#13131a",
              border: "1px solid #1e1e2a",
              padding: "6px 16px",
              fontSize: 11,
              fontWeight: 500,
              color: "#64647a",
              textDecoration: "none",
            }}
          >
            Calendar
          </a>
        )}
      </div>
    </motion.div>
  );
}
