"use client";

import { motion } from "framer-motion";

const BAR_COUNT = 7;
const STAGGER = 0.15;
const CYCLE = 1.5;

export function VoiceWaveform() {
  return (
    <div className="flex items-center justify-center gap-[5px]" aria-hidden="true">
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <motion.div
          key={i}
          className="waveform-bar"
          animate={{ height: [8, 28, 8] }}
          transition={{
            duration: CYCLE,
            delay: i * STAGGER,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
