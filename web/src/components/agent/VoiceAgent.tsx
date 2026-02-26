"use client";

import { useMemo } from "react";
import { VoiceVisualizer } from "@pipecat-ai/client-react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranscript } from "@/hooks/useTranscript";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import { TranscriptPanel } from "./TranscriptPanel";
import { AuditLog } from "./AuditLog";
import { SlotCards } from "./SlotCards";
import { BookingConfirm } from "./BookingConfirm";
import { GraphVisualizer } from "./GraphVisualizer";
import { StatusBar } from "./StatusBar";
import { VoiceOrb } from "./VoiceOrb";

function deriveOrbState(
  transportState: string,
  isConnected: boolean,
  isConnecting: boolean,
  messages: { role: string; final: boolean }[]
): "idle" | "connecting" | "listening" | "speaking" | "processing" {
  if (isConnecting) return "connecting";
  if (!isConnected) return "idle";

  const last = messages[messages.length - 1];
  if (last) {
    if (last.role === "assistant" && !last.final) return "speaking";
    if (last.role === "user" && !last.final) return "listening";
  }

  return "listening";
}

export function VoiceAgent() {
  const { messages } = useTranscript();
  const { entries, slots, bookedEvent, graphTrace } = useAuditLog();
  const { isConnected, isConnecting, transportState } = useVoiceAgent();

  const orbState = useMemo(
    () => deriveOrbState(transportState, isConnected, isConnecting, messages),
    [transportState, isConnected, isConnecting, messages]
  );

  const hasRightContent = slots.length > 0 || bookedEvent || entries.length > 0;

  return (
    <div className="relative h-[calc(100vh-3.25rem)] max-w-[1440px] mx-auto overflow-hidden">
      {/* StatusBar — floating pill, top center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
        <StatusBar />
      </div>

      {/* Orb — dead center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <VoiceOrb state={orbState} size="large" />
      </div>

      {/* TranscriptPanel — left HUD */}
      <div className="hidden lg:block absolute left-4 top-16 bottom-4 w-[340px] z-20 glass-hud opacity-90 hover:opacity-100 transition-opacity overflow-hidden rounded-2xl">
        <TranscriptPanel messages={messages} />
      </div>

      {/* Right panel — HUD overlay */}
      <AnimatePresence>
        {hasRightContent && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:flex absolute right-4 top-16 bottom-4 w-[340px] z-20 flex-col gap-3"
          >
            <AnimatePresence>
              {slots.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="glass-hud overflow-hidden rounded-2xl"
                >
                  <SlotCards slots={slots} />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {bookedEvent && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <BookingConfirm event={bookedEvent} />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 min-h-0 glass-hud overflow-hidden rounded-2xl">
              <AuditLog entries={entries} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GraphVisualizer — below orb, centered */}
      <AnimatePresence>
        {graphTrace.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 max-w-lg w-full z-20 px-4"
          >
            <GraphVisualizer trace={graphTrace} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Pipecat VoiceVisualizers — SDK needs these rendered */}
      <div className="sr-only" aria-hidden="true">
        <VoiceVisualizer
          participantType="local"
          backgroundColor="transparent"
          barColor="#a78bfa"
          barCount={5}
          barWidth={5}
          barGap={3}
          barMaxHeight={40}
          barOrigin="center"
        />
        <VoiceVisualizer
          participantType="bot"
          backgroundColor="transparent"
          barColor="#34d399"
          barCount={5}
          barWidth={5}
          barGap={3}
          barMaxHeight={40}
          barOrigin="center"
        />
      </div>
    </div>
  );
}
