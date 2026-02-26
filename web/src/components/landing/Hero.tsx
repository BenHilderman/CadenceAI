// Hero section — the first thing visitors see.
// Orb → waveform → heading → subheading → CTA, each animating in sequence.

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { VoiceOrb } from "@/components/agent/VoiceOrb";
import { VoiceWaveform } from "./VoiceWaveform";
import {
  ease,
  duration,
  cinematicFade,
  sectionContainer,
  itemReveal,
} from "@/lib/motion";

// The heading renders as: "Schedule by speaking."
// "Schedule" and "by" get the white-to-lavender gradient,
// "speaking." gets a separate animated purple-pink gradient.
const headingWords = ["Schedule", "by"];

export function Hero() {
  return (
    <section className="relative flex flex-col items-center justify-center text-center px-6 min-h-screen">

      {/* Soft purple radial glow centered behind the orb */}
      <div
        className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          top: "35%",
          transform: "translate(-50%, -50%)",
          width: 900,
          height: 700,
          background: "radial-gradient(ellipse, rgba(139,92,246,0.10) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center max-w-3xl">

        {/* Voice orb — fades in and scales up to 1.4x */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1.4 }}
          transition={{ delay: 0.1, duration: 1.0, ease: ease.softOut }}
          className="mb-6"
        >
          <VoiceOrb state="idle" hideLabel />
        </motion.div>

        {/* Waveform visualization — fades in after the orb */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mb-8"
        >
          <VoiceWaveform />
        </motion.div>

        {/* Main heading — each word staggers in via itemReveal */}
        <motion.h1
          variants={sectionContainer}
          initial="hidden"
          animate="visible"
          className="text-7xl sm:text-9xl font-extrabold tracking-[-0.04em] leading-[1.1] mb-6"
        >
          {headingWords.map((word, i) => (
            <motion.span
              key={i}
              variants={itemReveal}
              className="inline-block mr-[0.25em] text-hero-gradient"
            >
              {word}
            </motion.span>
          ))}

          {/* "speaking." — animated violet-to-pink gradient with glow */}
          <motion.span
            variants={itemReveal}
            className="inline-block pb-3"
            style={{
              background: "linear-gradient(135deg, #a78bfa 0%, #c084fc 25%, #e879f9 50%, #c084fc 75%, #a78bfa 100%)",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "gradient-shift 4s ease-in-out infinite",
              filter: "drop-shadow(0 0 30px rgba(192, 132, 252, 0.35)) drop-shadow(0 0 60px rgba(139, 92, 246, 0.2))",
            }}
          >
            speaking.
          </motion.span>
        </motion.h1>

        {/* Subheading — slow blur-in after the heading lands */}
        <motion.p
          variants={cinematicFade}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.7 }}
          className="text-lg sm:text-xl max-w-lg mx-auto mb-12 leading-relaxed tracking-[-0.01em]"
          style={{
            color: "#b0abca",
            textShadow: "0 0 30px rgba(139, 92, 246, 0.1)",
          }}
        >
          AI that checks your calendar and books meetings.{" "}
          <span className="text-foreground">All by voice.</span>
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.65, duration: duration.normal, ease: ease.out }}
          className="flex flex-col items-center gap-3"
        >
          {/* Primary button — floats gently, lifts + scales on hover */}
          <motion.div
            whileHover={{ y: -2, scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            animate={{ y: [0, -3, 0] }}
            transition={{
              y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
            }}
          >
            {/* Conic gradient border — brighter at top, subtle at sides */}
            <div
              className="rounded-full p-[1px]"
              style={{
                background: "conic-gradient(from 180deg, rgba(255,255,255,0.3), rgba(139,92,246,0.1) 25%, rgba(139,92,246,0.1) 50%, rgba(139,92,246,0.1) 75%, rgba(255,255,255,0.3))",
              }}
            >
              <Link
                href="/demo"
                className="group relative flex items-center gap-2.5 rounded-full px-10 py-4 text-[15px] font-semibold tracking-[0.03em] text-white btn-alive btn-shimmer"
                style={{
                  background: "linear-gradient(180deg, #a855f7 0%, #7c3aed 50%, #6d28d9 100%)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.4)",
                }}
              >
                Try the demo
                <ArrowRight
                  size={16}
                  className="group-hover:translate-x-1 transition-transform duration-200"
                />
              </Link>
            </div>
          </motion.div>

          {/* Secondary link — fades in slightly after the button */}
          <motion.div
            variants={cinematicFade}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.85 }}
          >
            <Link
              href="/book/demo"
              className="group/link flex items-center gap-1.5 text-sm hover:text-accent-bright transition-colors duration-300 link-underline"
              style={{ color: "#b0abca" }}
            >
              or book a meeting
              <ArrowRight
                size={13}
                className="opacity-0 -translate-x-1 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all duration-200"
              />
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Bouncing chevron hinting the user can scroll */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown size={20} className="text-muted/40" />
        </motion.div>
      </motion.div>
    </section>
  );
}
