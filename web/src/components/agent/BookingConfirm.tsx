"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Video, ExternalLink } from "lucide-react";
import type { BookedEvent } from "@/lib/types";

interface BookingConfirmProps {
  event: BookedEvent;
}

function ConfettiParticle({ index }: { index: number }) {
  const style = useMemo(() => {
    const colors = ["#34d399", "#6c5ce7", "#a78bfa", "#fbbf24", "#f472b6", "#38bdf8"];
    const color = colors[index % colors.length];
    const xOffset = (Math.random() - 0.5) * 160;
    const delay = Math.random() * 0.3;
    const size = 4 + Math.random() * 4;

    return { color, xOffset, delay, size };
  }, [index]);

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: style.size,
        height: style.size,
        backgroundColor: style.color,
        left: "50%",
        top: "50%",
      }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{
        x: style.xOffset,
        y: -60 - Math.random() * 60,
        opacity: 0,
        scale: 0.3,
      }}
      transition={{
        duration: 0.8 + Math.random() * 0.4,
        delay: style.delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    />
  );
}

function AnimatedCheckmark() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <motion.path
        d="M5 13l4 4L19 7"
        stroke="#34d399"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{ strokeDasharray: 1, strokeDashoffset: 0 }}
      />
    </svg>
  );
}

export function BookingConfirm({ event }: BookingConfirmProps) {
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

  const confettiParticles = useMemo(() => Array.from({ length: 16 }, (_, i) => i), []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, type: "spring", bounce: 0.25 }}
      className="relative rounded-2xl p-5 border border-emerald-500/20 glow-emerald overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(52, 211, 153, 0.08) 0%, rgba(108, 92, 231, 0.04) 100%)",
      }}
    >
      {/* Confetti burst */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {confettiParticles.map((i) => (
          <ConfettiParticle key={i} index={i} />
        ))}
      </div>

      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <AnimatedCheckmark />
          </div>
          <span className="text-xs font-mono font-semibold uppercase tracking-widest text-emerald-400">
            Booked
          </span>
        </div>
        <h4 className="text-foreground font-semibold text-lg mb-1">{event.title}</h4>
        <p className="text-sm text-muted mb-0.5">{dateStr}</p>
        <p className="text-sm text-muted mb-4">{timeStr}</p>
        <div className="flex gap-2">
          {event.meet_link && (
            <motion.a
              href={event.meet_link}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 rounded-full bg-accent/15 border border-accent/20 px-4 py-2 text-xs font-semibold text-accent-bright hover:bg-accent/25 transition-colors"
            >
              <Video size={12} />
              Join Meet
            </motion.a>
          )}
          {event.html_link && (
            <motion.a
              href={event.html_link}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 rounded-full bg-surface-raised border border-border px-4 py-2 text-xs font-medium text-muted hover:text-foreground hover:border-accent/20 transition-colors"
            >
              <ExternalLink size={12} />
              Calendar
            </motion.a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
