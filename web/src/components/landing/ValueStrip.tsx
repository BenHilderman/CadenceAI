"use client";

import { motion } from "framer-motion";
import { Mic, CalendarCheck, Sparkles } from "lucide-react";
import { sectionContainer, fadeInUp } from "@/lib/motion";

const items = [
  {
    icon: Mic,
    title: "Voice-first scheduling",
    desc: "Powered by Gemini Live speech-to-speech. Just talk naturally and Cadence handles the rest. No menus, no forms, no typing.",
  },
  {
    icon: CalendarCheck,
    title: "Real calendar, real availability",
    desc: "Reads your Google Calendar via the FreeBusy API and ranks open slots with a 7-factor algorithm. Every suggestion is actually free.",
  },
  {
    icon: Sparkles,
    title: "Booked in seconds",
    desc: "Confirms your name, time, and title, then creates a calendar event with a Google Meet link. One conversation, done.",
  },
];

export function ValueStrip() {
  return (
    <section id="how-it-works" className="relative px-6 py-20">
      <div className="glow-line mb-16" />

      {/* Section heading */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-14"
      >
        <h2
          className="text-3xl sm:text-4xl font-bold tracking-[-0.03em]"
          style={{
            background: "linear-gradient(135deg, #ff3b3b 0%, #3bff6e 40%, #3b8bff 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 20px rgba(59, 139, 255, 0.25))",
          }}
        >
          How it works
        </h2>
        <p className="text-muted text-sm mt-3 max-w-md mx-auto leading-relaxed">
          Three steps. One conversation. A real event on your calendar.
        </p>
      </motion.div>

      <motion.div
        variants={sectionContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6"
      >
        {items.map(({ icon: Icon, title, desc }, i) => (
          <motion.div
            key={title}
            variants={fadeInUp}
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="group relative flex flex-col items-center text-center px-6 py-8 rounded-2xl border border-white/[0.04] bg-white/[0.02] backdrop-blur-sm transition-colors duration-300 hover:border-white/12 hover:bg-white/[0.03]"
          >
            {/* Step number */}
            <span
              className="absolute top-4 right-5 text-[11px] font-mono font-semibold"
              style={{
                background: "linear-gradient(135deg, #d4d4d4, #ffffff)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                opacity: 0.4,
              }}
            >
              0{i + 1}
            </span>

            {/* Icon */}
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
              style={{
                background: "linear-gradient(135deg, rgba(212, 212, 212, 0.12), rgba(255, 255, 255, 0.08))",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                boxShadow: "0 0 24px rgba(255, 255, 255, 0.06)",
              }}
            >
              <Icon
                size={20}
                style={{
                  color: "#d4d4d4",
                  filter: "drop-shadow(0 0 8px rgba(212, 212, 212, 0.4))",
                }}
              />
            </div>

            <h3 className="text-[15px] font-semibold text-foreground tracking-[-0.01em] mb-2.5">
              {title}
            </h3>

            <p className="text-[13px] text-muted leading-relaxed">
              {desc}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
