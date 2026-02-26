"use client";

import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePipecatClientMicControl } from "@pipecat-ai/client-react";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function StatusBar() {
  const { connect, disconnect, isConnected, isConnecting, elapsed, error } =
    useVoiceAgent();
  const { isMicEnabled, enableMic } = usePipecatClientMicControl();

  return (
    <div className="inline-flex items-center gap-4 rounded-2xl glass glass-border px-5 py-3">
      <div className="flex items-center gap-3">
        <AnimatePresence mode="wait" initial={false}>
          {isConnected ? (
            <motion.button
              key="end"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={disconnect}
              className="flex items-center gap-2 rounded-full bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 px-5 py-2 text-sm font-medium text-red-400 transition-all"
            >
              <PhoneOff size={14} />
              End
            </motion.button>
          ) : (
            <motion.div
              key="connect"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              {/* Pulsing glow ring behind connect button */}
              {!isConnecting && (
                <div className="absolute inset-0 rounded-full animate-connect-glow" />
              )}
              <button
                onClick={connect}
                disabled={isConnecting}
                className="relative flex items-center gap-2 rounded-full bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2 text-sm font-semibold text-white transition-all glow-accent-strong"
              >
                <Phone size={14} />
                {isConnecting ? "Connecting..." : "Connect"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {isConnected && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            onClick={() => enableMic(!isMicEnabled)}
            className={`relative rounded-full p-2.5 transition-all ${
              isMicEnabled
                ? "bg-surface-raised border border-border text-foreground hover:border-accent/30"
                : "bg-red-500/15 border border-red-500/20 text-red-400"
            }`}
          >
            {isMicEnabled && (
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{ border: "1px solid rgba(167, 139, 250, 0.2)" }}
              />
            )}
            {isMicEnabled ? <Mic size={14} /> : <MicOff size={14} />}
          </motion.button>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs">
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            {/* Enhanced live indicator */}
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
            <span className="text-muted font-mono tabular-nums bg-surface/60 px-2.5 py-1 rounded-full border border-accent-glow/10">
              {formatTime(elapsed)}
            </span>
          </motion.div>
        )}
        {error && <span className="text-red-400">{error}</span>}
      </div>
    </div>
  );
}
