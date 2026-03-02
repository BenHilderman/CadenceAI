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
  sectionContainer,
  itemReveal,
} from "@/lib/motion";

// The heading renders as: "Schedule by speaking."
// "Schedule" and "by" get the white gradient,
// "speaking." gets a separate animated RGB gradient.
const headingWords = ["Schedule", "by"];

export function Hero() {
  return (
    <section className="relative flex flex-col items-center justify-center text-center px-6 min-h-screen">

      {/* Soft radial glow centered behind the orb */}
      <div
        className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          top: "35%",
          transform: "translate(-50%, -50%)",
          width: 900,
          height: 700,
          background: "radial-gradient(ellipse, rgba(255,255,255,0.04) 0%, transparent 65%)",
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

          {/* "speaking." — animated RGB gradient with glow */}
          <motion.span
            variants={itemReveal}
            className="inline-block pb-3"
            style={{
              background: "linear-gradient(135deg, #ff3b3b 0%, #3bff6e 25%, #3b8bff 50%, #ff3b3b 75%, #3bff6e 100%)",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "gradient-shift 4s ease-in-out infinite",
              filter: "drop-shadow(0 0 30px rgba(59, 139, 255, 0.35)) drop-shadow(0 0 60px rgba(59, 255, 110, 0.2))",
            }}
          >
            speaking.
          </motion.span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8, ease: ease.softOut }}
          className="text-lg sm:text-xl max-w-lg mx-auto mb-12 leading-relaxed tracking-[-0.01em]"
          style={{
            color: "#9a9aa8",
            textShadow: "0 0 30px rgba(255, 255, 255, 0.06)",
          }}
        >
          AI that checks your calendar and books meetings.{" "}
          <span className="text-foreground">All by voice.</span>
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.6, ease: ease.softOut }}
          className="flex flex-col items-center gap-3"
        >
          <div
            className="rounded-full p-[1px]"
            style={{
              background: "conic-gradient(from 180deg, rgba(255,255,255,0.3), rgba(255,255,255,0.08) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.08) 75%, rgba(255,255,255,0.3))",
            }}
          >
            <Link
              href="/demo"
              className="group relative flex items-center gap-2.5 rounded-full px-10 py-4 text-[15px] font-semibold tracking-[0.03em] text-white btn-shimmer transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
              style={{
                background: "linear-gradient(180deg, #3a3a42 0%, #2a2a30 50%, #1a1a20 100%)",
                textShadow: "0 1px 2px rgba(0,0,0,0.4)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.3), 0 0 24px rgba(255,255,255,0.2), 0 0 60px rgba(255,255,255,0.08)",
              }}
            >
              Try the demo
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform duration-300"
              />
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.6 }}
          >
            <Link
              href="/book/demo"
              className="group/link flex items-center gap-1.5 text-sm hover:text-white transition-colors duration-300 link-underline"
              style={{ color: "#9a9aa8" }}
            >
              or book a meeting
              <ArrowRight
                size={13}
                className="opacity-0 -translate-x-1 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all duration-300"
              />
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll hint chevron */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="animate-float-slow">
          <ChevronDown size={20} className="text-muted/40" />
        </div>
      </motion.div>
    </section>
  );
}
