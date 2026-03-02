"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Video, ExternalLink, CheckCircle2, Mail } from "lucide-react";

interface BookingConfirmationProps {
  event: {
    id: string;
    title: string;
    start: string;
    end: string;
    html_link: string;
    meet_link: string;
  };
}

function ConfettiParticle({ index }: { index: number }) {
  const style = useMemo(() => {
    const colors = ["#34d399", "#ff3b3b", "#3bff6e", "#3b8bff", "#fbbf24", "#38bdf8"];
    const color = colors[index % colors.length];
    const xOffset = (Math.random() - 0.5) * 200;
    const delay = Math.random() * 0.4;
    const size = 4 + Math.random() * 5;
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
        top: "40%",
      }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{
        x: style.xOffset,
        y: -80 - Math.random() * 80,
        opacity: 0,
        scale: 0.2,
      }}
      transition={{
        duration: 1 + Math.random() * 0.5,
        delay: style.delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    />
  );
}

export function BookingConfirmation({ event }: BookingConfirmationProps) {
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

  const confettiParticles = useMemo(
    () => Array.from({ length: 24 }, (_, i) => i),
    []
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
        className="relative rounded-2xl p-6 border border-emerald-500/20 glow-emerald overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(52, 211, 153, 0.08) 0%, rgba(10, 10, 14, 0.04) 100%)",
        }}
      >
        {/* Confetti */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confettiParticles.map((i) => (
            <ConfettiParticle key={i} index={i} />
          ))}
        </div>

        <div className="relative">
          {/* Success icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
            className="flex items-center gap-3 mb-5"
          >
            <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 size={22} className="text-emerald-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-emerald-400 block">
                You&apos;re booked!
              </span>
              <span className="text-[10px] font-mono text-muted uppercase tracking-wider">
                Confirmed
              </span>
            </div>
          </motion.div>

          <h3 className="text-lg font-semibold text-foreground mb-1">
            {event.title}
          </h3>
          <p className="text-sm text-muted mb-0.5">{dateStr}</p>
          <p className="text-sm text-muted mb-5">{timeStr}</p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            {event.meet_link && (
              <motion.a
                href={event.meet_link}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="focus-ring w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-full bg-white/[0.08] border border-white/15 px-5 py-2.5 text-xs font-semibold text-white hover:bg-white/15 transition-colors"
              >
                <Video size={13} />
                Join Google Meet
              </motion.a>
            )}
            {event.html_link && (
              <motion.a
                href={event.html_link}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="focus-ring w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-full bg-surface-raised border border-border px-5 py-2.5 text-xs font-medium text-muted hover:text-foreground hover:border-white/15 transition-colors"
              >
                <ExternalLink size={13} />
                View in Calendar
              </motion.a>
            )}
          </div>
        </div>
      </motion.div>

      {/* Calendar invite sent notice */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-2 justify-center text-muted"
      >
        <Mail size={14} />
        <span className="text-xs">Calendar invite sent to your email</span>
      </motion.div>
    </div>
  );
}
