"use client";

import { Mic, MicOff, PhoneOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePipecatClientMicControl } from "@pipecat-ai/client-react";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function StatusBar() {
  const { disconnect, isConnected, elapsed, error } = useVoiceAgent();
  const { isMicEnabled, enableMic } = usePipecatClientMicControl();

  // Only render when connected — the orb handles connecting
  if (!isConnected && !error) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3 }}
        className="inline-flex items-center gap-4 rounded-2xl glass glass-border px-5 py-3"
      >
        <div className="flex items-center gap-3">
          <motion.button
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            onClick={disconnect}
            className="flex items-center gap-2 rounded-full bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 px-5 py-2 text-sm font-medium text-red-400 transition-all"
          >
            <PhoneOff size={14} />
            End
          </motion.button>

          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            onClick={() => enableMic(!isMicEnabled)}
            className={`relative rounded-full p-2.5 transition-all ${
              isMicEnabled
                ? "bg-surface-raised border border-border text-foreground hover:border-white/20"
                : "bg-red-500/15 border border-red-500/20 text-red-400"
            }`}
          >
            {isMicEnabled && (
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{ border: "1px solid rgba(255, 255, 255, 0.2)" }}
              />
            )}
            {isMicEnabled ? <Mic size={14} /> : <MicOff size={14} />}
          </motion.button>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            {/* Live indicator */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-pulse-ring" />
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-pulse-ring" style={{ animationDelay: "0.5s" }} />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-emerald-400 font-medium">Live</span>
              <div className="flex items-center gap-px ml-1">
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-[2px] rounded-full bg-emerald-400/60"
                    animate={{ height: [4, 10, 4] }}
                    transition={{
                      duration: 0.8,
                      delay: i * 0.15,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Timer pill */}
            <span className="text-muted font-mono tabular-nums bg-surface/60 px-2.5 py-1 rounded-full border border-white/10">
              {formatTime(elapsed)}
            </span>
          </motion.div>
          {error && <span className="text-red-400">{error}</span>}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
