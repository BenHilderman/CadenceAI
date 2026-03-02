"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useMemo } from "react";
import { Mic } from "lucide-react";

type OrbState = "idle" | "connecting" | "listening" | "speaking" | "processing";
type OrbSize = "default" | "large";

interface VoiceOrbProps {
  state: OrbState;
  size?: OrbSize;
  hideLabel?: boolean;
  onClick?: () => void;
  showClickHint?: boolean;
}

const SIZES = {
  default: { container: 220, blob: 170, bloom: 380, ripple: 180 },
  large:   { container: 260, blob: 200, bloom: 440, ripple: 220 },
};

const STATE_LABELS: Record<OrbState, string> = {
  idle: "Ready",
  connecting: "Connecting",
  listening: "Listening",
  speaking: "Speaking",
  processing: "Processing",
};

/* ——— Morphing blob border-radius keyframes ——— */
const BLOB_SHAPES = [
  "52% 48% 66% 34% / 38% 64% 36% 62%",
  "64% 36% 52% 48% / 62% 38% 64% 36%",
  "58% 42% 42% 58% / 58% 69% 31% 42%",
  "42% 58% 58% 42% / 42% 31% 69% 58%",
  "52% 48% 66% 34% / 38% 64% 36% 62%",
];

/* ——— Color palettes per state ——— */
interface Palette {
  c1: string; c2: string;
  glow: string; bloom: string;
  label: string; dot: string;
}

const PALETTES: Record<OrbState, Palette> = {
  idle: {
    c1: "radial-gradient(circle at 50% 90%, #2a2a30 0%, #0a0a0e 100%)",
    c2: "radial-gradient(circle at 33% 12%, #b0b0b8 0%, #1a1a20 50%, transparent 100%)",
    glow: "rgba(255, 255, 255, 0.1)",
    bloom: "rgba(255, 255, 255, 0.06)",
    label: "text-muted",
    dot: "#b0b0b8",
  },
  connecting: {
    c1: "radial-gradient(circle at 50% 90%, #3a3a42 0%, #0a0a0e 100%)",
    c2: "radial-gradient(circle at 33% 12%, #c0c0c8 0%, #2a2a30 50%, transparent 100%)",
    glow: "rgba(255, 255, 255, 0.15)",
    bloom: "rgba(255, 255, 255, 0.1)",
    label: "text-white",
    dot: "#c0c0c8",
  },
  listening: {
    c1: "radial-gradient(circle at 50% 90%, #e0e0e0 0%, #1a1a20 100%)",
    c2: "radial-gradient(circle at 33% 12%, #ffffff 0%, #4a4a52 50%, transparent 100%)",
    glow: "rgba(255, 255, 255, 0.3)",
    bloom: "rgba(255, 255, 255, 0.2)",
    label: "text-white",
    dot: "#ffffff",
  },
  speaking: {
    c1: "radial-gradient(circle at 50% 90%, #059669 0%, #022c22 100%)",
    c2: "radial-gradient(circle at 33% 12%, #34d399 0%, #065f46 50%, transparent 100%)",
    glow: "rgba(52, 211, 153, 0.3)",
    bloom: "rgba(52, 211, 153, 0.2)",
    label: "text-emerald-400",
    dot: "#34d399",
  },
  processing: {
    c1: "radial-gradient(circle at 50% 90%, #d97706 0%, #451a03 100%)",
    c2: "radial-gradient(circle at 33% 12%, #fbbf24 0%, #92400e 50%, transparent 100%)",
    glow: "rgba(251, 191, 36, 0.25)",
    bloom: "rgba(251, 191, 36, 0.15)",
    label: "text-amber-400",
    dot: "#fbbf24",
  },
};

export function VoiceOrb({ state, size = "default", hideLabel = false, onClick, showClickHint = true }: VoiceOrbProps) {
  const isActive = state === "listening" || state === "speaking";
  const isAnimating = state !== "idle";
  const isClickable = state === "idle" && !!onClick;
  const palette = PALETTES[state];
  const dims = SIZES[size];

  // Spring reactivity
  const activity = useSpring(0, { stiffness: 100, damping: 18 });
  const bloomScale = useTransform(activity, [0, 1], [1, 1.12]);
  const bloomOpacity = useTransform(activity, [0, 1], [0.2, 0.45]);

  useEffect(() => {
    activity.set(isActive ? 1 : 0);
  }, [isActive, activity]);

  // Timing
  const morphSpeed = state === "speaking" ? 4 : state === "listening" ? 4 : 8;
  const rotationSpeed = state === "speaking" ? 12 : 20;

  const rippleRings = useMemo(() => [0, 0.7, 1.4], []);

  return (
    <div className="flex flex-col items-center gap-6">
      <motion.div
        className={`relative flex items-center justify-center ${isClickable ? "cursor-pointer" : ""}`}
        style={{ width: dims.container, height: dims.container }}
        onClick={isClickable ? onClick : undefined}
        whileHover={isClickable ? { scale: 1.06 } : undefined}
        whileTap={isClickable ? { scale: 0.97 } : undefined}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >

        {/* Layer 1: Bloom backdrop */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            width: dims.bloom,
            height: dims.bloom,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${palette.bloom} 0%, transparent 65%)`,
            scale: bloomScale,
            opacity: bloomOpacity,
            filter: "blur(80px)",
          }}
        />

        {/* Layer 2: Ripple rings (active states only) */}
        {(isActive || state === "processing") &&
          rippleRings.map((delay, i) => (
            <motion.div
              key={`ripple-${i}`}
              className="absolute rounded-full border"
              style={{
                width: dims.ripple,
                height: dims.ripple,
                borderColor: state === "speaking"
                  ? "rgba(52, 211, 153, 0.2)"
                  : state === "processing"
                  ? "rgba(251, 191, 36, 0.15)"
                  : "rgba(255, 255, 255, 0.2)",
              }}
              initial={{ scale: 0.8, opacity: 0.4 }}
              animate={{ scale: 2.0, opacity: 0 }}
              transition={{
                duration: 2.5,
                delay,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          ))}

        {/* Layer 4: Morphing blob container */}
        <motion.div
          className="relative overflow-hidden"
          style={{
            width: dims.blob,
            height: dims.blob,
            boxShadow: `0 0 40px ${palette.glow}, 0 0 80px ${palette.bloom}`,
          }}
          animate={{
            borderRadius: isAnimating ? BLOB_SHAPES : BLOB_SHAPES[0],
            rotate: 360,
            scale: isActive ? [1, 1.06, 1] : 1,
          }}
          transition={{
            borderRadius: isAnimating ? {
              duration: morphSpeed,
              repeat: Infinity,
              ease: "easeInOut",
            } : { duration: 0.6 },
            rotate: {
              duration: rotationSpeed,
              repeat: Infinity,
              ease: "linear",
            },
            scale: isActive
              ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.6 },
          }}
        >
          {/* Color layer — base */}
          <div className="absolute inset-0" style={{ background: palette.c1 }} />

          {/* Color layer — soft-light overlay */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: palette.c2,
              mixBlendMode: "soft-light",
              opacity: 0.8,
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          />

        </motion.div>

        {/* Connecting spinner overlay */}
        {state === "connecting" && (
          <motion.div
            className="absolute rounded-full border-2 border-transparent"
            style={{
              width: dims.blob + 30,
              height: dims.blob + 30,
              borderTopColor: "rgba(255, 255, 255, 0.5)",
              borderRightColor: "rgba(255, 255, 255, 0.15)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        )}

        {/* Processing pulse ring */}
        {state === "processing" && (
          <motion.div
            className="absolute rounded-full"
            style={{
              width: dims.ripple,
              height: dims.ripple,
              border: "2px solid rgba(251, 191, 36, 0.25)",
            }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.15, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </motion.div>

      {/* State label */}
      {!hideLabel && (
        <motion.span
          key={state}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`text-sm font-mono uppercase tracking-[0.2em] flex items-center gap-2 ${palette.label}`}
        >
          {isClickable && showClickHint ? (
            <>
              <Mic size={14} />
              Tap to talk
            </>
          ) : (
            <>
              {isAnimating && (
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: palette.dot,
                    boxShadow: `0 0 8px ${palette.dot}80`,
                  }}
                />
              )}
              {STATE_LABELS[state]}
            </>
          )}
        </motion.span>
      )}
    </div>
  );
}
