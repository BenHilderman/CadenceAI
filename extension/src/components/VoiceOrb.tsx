import React from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

type OrbState = "idle" | "connecting" | "listening" | "speaking" | "processing";

interface VoiceOrbProps {
  state: OrbState;
  size?: number;
}

const STATE_LABELS: Record<OrbState, string> = {
  idle: "Ready",
  connecting: "Connecting",
  listening: "Listening",
  speaking: "Speaking",
  processing: "Processing",
};

const BLOB_SHAPES = [
  "52% 48% 66% 34% / 38% 64% 36% 62%",
  "64% 36% 52% 48% / 62% 38% 64% 36%",
  "58% 42% 42% 58% / 58% 69% 31% 42%",
  "42% 58% 58% 42% / 42% 31% 69% 58%",
  "52% 48% 66% 34% / 38% 64% 36% 62%",
];

interface Palette {
  c1: string; c2: string;
  glow: string; bloom: string;
  label: string; dot: string;
}

const PALETTES: Record<OrbState, Palette> = {
  idle: {
    c1: "radial-gradient(circle at 50% 90%, #6c5ce7 0%, #1a1033 100%)",
    c2: "radial-gradient(circle at 33% 12%, #a78bfa 0%, #3b1f8e 50%, transparent 100%)",
    glow: "rgba(108, 92, 231, 0.15)",
    bloom: "rgba(108, 92, 231, 0.12)",
    label: "#64647a",
    dot: "#a78bfa",
  },
  connecting: {
    c1: "radial-gradient(circle at 50% 90%, #6c5ce7 0%, #1a1033 100%)",
    c2: "radial-gradient(circle at 33% 12%, #a78bfa 0%, #3b1f8e 50%, transparent 100%)",
    glow: "rgba(108, 92, 231, 0.2)",
    bloom: "rgba(108, 92, 231, 0.15)",
    label: "#a78bfa",
    dot: "#a78bfa",
  },
  listening: {
    c1: "radial-gradient(circle at 50% 90%, #7c3aed 0%, #1e1145 100%)",
    c2: "radial-gradient(circle at 33% 12%, #c084fc 0%, #5b21b6 50%, transparent 100%)",
    glow: "rgba(167, 139, 250, 0.3)",
    bloom: "rgba(167, 139, 250, 0.2)",
    label: "#a78bfa",
    dot: "#c084fc",
  },
  speaking: {
    c1: "radial-gradient(circle at 50% 90%, #059669 0%, #022c22 100%)",
    c2: "radial-gradient(circle at 33% 12%, #34d399 0%, #065f46 50%, transparent 100%)",
    glow: "rgba(52, 211, 153, 0.3)",
    bloom: "rgba(52, 211, 153, 0.2)",
    label: "#34d399",
    dot: "#34d399",
  },
  processing: {
    c1: "radial-gradient(circle at 50% 90%, #d97706 0%, #451a03 100%)",
    c2: "radial-gradient(circle at 33% 12%, #fbbf24 0%, #92400e 50%, transparent 100%)",
    glow: "rgba(251, 191, 36, 0.25)",
    bloom: "rgba(251, 191, 36, 0.15)",
    label: "#fbbf24",
    dot: "#fbbf24",
  },
};

export function VoiceOrb({ state, size = 120 }: VoiceOrbProps) {
  const isActive = state === "listening" || state === "speaking";
  const isAnimating = state !== "idle";
  const palette = PALETTES[state];

  const activity = useSpring(0, { stiffness: 100, damping: 18 });
  const bloomScale = useTransform(activity, [0, 1], [1, 1.12]);
  const bloomOpacity = useTransform(activity, [0, 1], [0.3, 0.6]);

  useEffect(() => {
    activity.set(isActive ? 1 : 0);
  }, [isActive, activity]);

  const morphSpeed = state === "speaking" ? 4 : 8;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div
        style={{
          position: "relative",
          width: size + 40,
          height: size + 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Bloom backdrop */}
        <motion.div
          style={{
            position: "absolute",
            width: size * 2,
            height: size * 2,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${palette.bloom} 0%, transparent 65%)`,
            scale: bloomScale,
            opacity: bloomOpacity,
            filter: "blur(30px)",
            pointerEvents: "none",
          }}
        />

        {/* Morphing blob */}
        <motion.div
          style={{
            position: "relative",
            width: size,
            height: size,
            overflow: "hidden",
          }}
          animate={{
            borderRadius: BLOB_SHAPES,
            scale: isActive ? [1, 1.06, 1] : 1,
            boxShadow: [
              `0 0 20px ${palette.glow}, 0 0 40px ${palette.bloom}`,
              `0 0 30px ${palette.glow}, 0 0 60px ${palette.bloom}`,
              `0 0 20px ${palette.glow}, 0 0 40px ${palette.bloom}`,
            ],
          }}
          transition={{
            borderRadius: { duration: morphSpeed, repeat: Infinity, ease: "easeInOut" },
            scale: isActive
              ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.6 },
            boxShadow: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          <div style={{ position: "absolute", inset: 0, background: palette.c1 }} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: palette.c2,
              mixBlendMode: "soft-light",
              opacity: 0.8,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              boxShadow: "inset 0 -10px 20px rgba(0,0,0,0.3), inset 0 10px 20px rgba(255,255,255,0.06)",
              borderRadius: "inherit",
            }}
          />
        </motion.div>

        {/* Connecting spinner */}
        {state === "connecting" && (
          <motion.div
            style={{
              position: "absolute",
              width: size + 20,
              height: size + 20,
              borderRadius: "50%",
              border: "2px solid transparent",
              borderTopColor: "rgba(167, 139, 250, 0.5)",
              borderRightColor: "rgba(167, 139, 250, 0.15)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        )}
      </div>

      {/* Label */}
      <span
        style={{
          fontSize: 10,
          fontFamily: "monospace",
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          color: palette.label,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {isAnimating && (
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: palette.dot,
              boxShadow: `0 0 8px ${palette.dot}80`,
            }}
          />
        )}
        {STATE_LABELS[state]}
      </span>
    </div>
  );
}
