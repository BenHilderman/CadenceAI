"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useMemo } from "react";

type OrbState = "idle" | "connecting" | "listening" | "speaking" | "processing";
type OrbSize = "default" | "large";

interface VoiceOrbProps {
  state: OrbState;
  size?: OrbSize;
  hideLabel?: boolean;
}

const SIZES = {
  default: { container: 260, blob: 210, bloom: 500, particleRadius: 130, ripple: 220 },
  large:   { container: 320, blob: 280, bloom: 600, particleRadius: 160, ripple: 280 },
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
  c1: string; c2: string; c3: string; c4: string;
  glow: string; bloom: string;
  label: string; dot: string;
}

const PALETTES: Record<OrbState, Palette> = {
  idle: {
    c1: "radial-gradient(circle at 50% 90%, #7c3aed 0%, #110f24 100%)",
    c2: "radial-gradient(circle at 33% 12%, #a78bfa 0%, #3b1f8e 50%, transparent 100%)",
    c3: "radial-gradient(circle at 31% 12%, #c084fc 0%, #7c3aed 60%, transparent 100%)",
    c4: "radial-gradient(circle at 12% 80%, #8b5cf6 0%, #1e1145 60%, transparent 100%)",
    glow: "rgba(139, 92, 246, 0.15)",
    bloom: "rgba(139, 92, 246, 0.12)",
    label: "text-muted",
    dot: "#a78bfa",
  },
  connecting: {
    c1: "radial-gradient(circle at 50% 90%, #7c3aed 0%, #110f24 100%)",
    c2: "radial-gradient(circle at 33% 12%, #a78bfa 0%, #3b1f8e 50%, transparent 100%)",
    c3: "radial-gradient(circle at 31% 12%, #c084fc 0%, #7c3aed 60%, transparent 100%)",
    c4: "radial-gradient(circle at 12% 80%, #8b5cf6 0%, #1e1145 60%, transparent 100%)",
    glow: "rgba(139, 92, 246, 0.2)",
    bloom: "rgba(139, 92, 246, 0.15)",
    label: "text-accent-bright",
    dot: "#a78bfa",
  },
  listening: {
    c1: "radial-gradient(circle at 50% 90%, #8b5cf6 0%, #110f24 100%)",
    c2: "radial-gradient(circle at 33% 12%, #c084fc 0%, #5b21b6 50%, transparent 100%)",
    c3: "radial-gradient(circle at 31% 12%, #d8b4fe 0%, #8b5cf6 60%, transparent 100%)",
    c4: "radial-gradient(circle at 12% 80%, #a78bfa 0%, #1e1145 60%, transparent 100%)",
    glow: "rgba(139, 92, 246, 0.3)",
    bloom: "rgba(139, 92, 246, 0.2)",
    label: "text-accent-bright",
    dot: "#c084fc",
  },
  speaking: {
    c1: "radial-gradient(circle at 50% 90%, #059669 0%, #022c22 100%)",
    c2: "radial-gradient(circle at 33% 12%, #34d399 0%, #065f46 50%, transparent 100%)",
    c3: "radial-gradient(circle at 31% 12%, #6ee7b7 0%, #059669 60%, transparent 100%)",
    c4: "radial-gradient(circle at 12% 80%, #10b981 0%, #064e3b 60%, transparent 100%)",
    glow: "rgba(52, 211, 153, 0.3)",
    bloom: "rgba(52, 211, 153, 0.2)",
    label: "text-emerald-400",
    dot: "#34d399",
  },
  processing: {
    c1: "radial-gradient(circle at 50% 90%, #d97706 0%, #451a03 100%)",
    c2: "radial-gradient(circle at 33% 12%, #fbbf24 0%, #92400e 50%, transparent 100%)",
    c3: "radial-gradient(circle at 31% 12%, #fcd34d 0%, #d97706 60%, transparent 100%)",
    c4: "radial-gradient(circle at 12% 80%, #f59e0b 0%, #78350f 60%, transparent 100%)",
    glow: "rgba(251, 191, 36, 0.25)",
    bloom: "rgba(251, 191, 36, 0.15)",
    label: "text-amber-400",
    dot: "#fbbf24",
  },
};

/* ——— Particle orbit configs ——— */
const PARTICLE_SEEDS = Array.from({ length: 8 }, (_, i) => ({
  size: 1.5 + Math.random() * 1.5,
  radiusOffset: Math.random() * 40,
  duration: 6 + Math.random() * 10,
  startAngle: (360 / 8) * i + Math.random() * 20,
  opacity: 0.25 + Math.random() * 0.3,
}));

export function VoiceOrb({ state, size = "default", hideLabel = false }: VoiceOrbProps) {
  const isActive = state === "listening" || state === "speaking";
  const isAnimating = state !== "idle";
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
      <div className="relative flex items-center justify-center" style={{ width: dims.container, height: dims.container }}>

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

        {/* Layer 2: Orbiting particles */}
        {PARTICLE_SEEDS.map((p, i) => {
          const r = dims.particleRadius + p.radiusOffset;
          return (
            <motion.div
              key={`particle-${i}`}
              className="absolute pointer-events-none"
              style={{
                width: p.size,
                height: p.size,
                borderRadius: "50%",
                background: palette.dot,
                boxShadow: `0 0 6px ${palette.dot}80`,
                opacity: isAnimating ? p.opacity : p.opacity * 0.3,
                left: "50%",
                top: "50%",
                marginLeft: -p.size / 2,
                marginTop: -p.size / 2,
                transformOrigin: `0px 0px`,
              }}
              animate={{
                rotate: [p.startAngle, p.startAngle + 360],
                x: [Math.cos((p.startAngle * Math.PI) / 180) * r, Math.cos(((p.startAngle + 360) * Math.PI) / 180) * r],
                y: [Math.sin((p.startAngle * Math.PI) / 180) * r, Math.sin(((p.startAngle + 360) * Math.PI) / 180) * r],
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          );
        })}

        {/* Layer 3: Ripple rings (active states only) */}
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
                  : "rgba(167, 139, 250, 0.2)",
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
          style={{ width: dims.blob, height: dims.blob }}
          animate={{
            borderRadius: BLOB_SHAPES,
            rotate: 360,
            scale: isActive ? [1, 1.06, 1] : 1,
            boxShadow: [
              `0 0 30px ${palette.glow}, 0 0 60px ${palette.bloom}, 0 0 120px ${palette.bloom}`,
              `0 0 50px ${palette.glow}, 0 0 100px ${palette.bloom}, 0 0 160px ${palette.bloom}`,
              `0 0 30px ${palette.glow}, 0 0 60px ${palette.bloom}, 0 0 120px ${palette.bloom}`,
            ],
          }}
          transition={{
            borderRadius: {
              duration: morphSpeed,
              repeat: Infinity,
              ease: "easeInOut",
            },
            rotate: {
              duration: rotationSpeed,
              repeat: Infinity,
              ease: "linear",
            },
            scale: isActive
              ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.6 },
            boxShadow: {
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
        >
          {/* Layer 5: Color layer 1 — base */}
          <motion.div
            className="absolute inset-0"
            style={{ background: palette.c1 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />

          {/* Layer 6: Color layer 2 — soft-light */}
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

          {/* Layer 7: Color layer 3 — color-dodge */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: palette.c3,
              mixBlendMode: "color-dodge",
              opacity: 0.65,
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
          />

          {/* Layer 8: Color layer 4 — color */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: palette.c4,
              mixBlendMode: "color",
              opacity: 0.55,
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />

          {/* Layer 9: Noise texture overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              mixBlendMode: "overlay",
              opacity: 0.15,
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: "128px 128px",
            }}
          />

          {/* Layer 10: Glass specular highlights */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: `
                inset 0 -20px 40px rgba(0,0,0,0.3),
                inset 0 20px 40px rgba(255,255,255,0.06),
                inset -10px -10px 30px rgba(0,0,0,0.2)
              `,
              borderRadius: "inherit",
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              top: "8%",
              left: "15%",
              width: "55%",
              height: "35%",
              borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(255,255,255,0.07) 0%, transparent 70%)",
            }}
          />
        </motion.div>

        {/* Connecting spinner overlay */}
        {state === "connecting" && (
          <motion.div
            className="absolute rounded-full border-2 border-transparent"
            style={{
              width: dims.blob + 30,
              height: dims.blob + 30,
              borderTopColor: "rgba(167, 139, 250, 0.5)",
              borderRightColor: "rgba(167, 139, 250, 0.15)",
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
      </div>

      {/* State label */}
      {!hideLabel && (
        <motion.span
          key={state}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`text-xs font-mono uppercase tracking-[0.2em] ${palette.label}`}
        >
          {isAnimating && (
            <span
              className="inline-block h-1.5 w-1.5 rounded-full mr-2 align-middle"
              style={{
                backgroundColor: palette.dot,
                boxShadow: `0 0 8px ${palette.dot}80`,
              }}
            />
          )}
          {STATE_LABELS[state]}
        </motion.span>
      )}
    </div>
  );
}
